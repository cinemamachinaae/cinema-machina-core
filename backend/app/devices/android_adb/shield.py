"""Read-only Nvidia Shield monitoring via ADB-over-network."""

from __future__ import annotations

import logging
import re
import subprocess
from dataclasses import dataclass, field
from typing import cast

from app.config.settings import settings
from app.models.device import ShieldDeviceState
from app.models.playback import Confidence

logger = logging.getLogger(__name__)

_ADB_TIMEOUT_S = 4.0

_FOREGROUND_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"mCurrentFocus=.*? (?P<package>[A-Za-z0-9._]+)/(?P<activity>[A-Za-z0-9_.$/]+)"),
    re.compile(r"mFocusedApp=.*? (?P<package>[A-Za-z0-9._]+)/(?P<activity>[A-Za-z0-9_.$/]+)"),
    re.compile(r"topResumedActivity=.*? (?P<package>[A-Za-z0-9._]+)/(?P<activity>[A-Za-z0-9_.$/]+)"),
    re.compile(r"mResumedActivity:.*? (?P<package>[A-Za-z0-9._]+)/(?P<activity>[A-Za-z0-9_.$/]+)"),
)

_MEDIA_SESSION_PACKAGE_PATTERN = re.compile(r"package=(?P<package>[A-Za-z0-9._]+)")
_MEDIA_SESSION_STATE_PATTERN = re.compile(r"state=PlaybackState \{state=(?P<state>\d+)")
_DISPLAY_MODE_PATTERN = re.compile(r"(?P<width>\d{3,4}) x (?P<height>\d{3,4})(?:,|.*?)(?P<refresh>\d{2,3}(?:\.\d+)?) fps")

_APP_NAME_MAP: dict[str, str] = {
    "com.plexapp.android": "Plex",
    "org.xbmc.kodi": "Kodi",
    "org.jellyfin.androidtv": "Jellyfin",
    "com.netflix.ninja": "Netflix",
    "com.google.android.youtube.tv": "YouTube",
    "com.google.android.youtube.tvunplugged": "YouTube",
    "com.disney.disneyplus": "Disney+",
    "com.amazon.amazonvideo.livingroom": "Prime Video",
    "com.apple.atve.androidtv.appletv": "Apple TV",
    "org.videolan.vlc": "VLC",
}


@dataclass
class ShieldMonitorResult:
    """Internal Shield monitor result with debug payload."""

    public_state: ShieldDeviceState
    debug: dict[str, str] = field(default_factory=dict)


class ShieldAdbMonitor:
    """Read-only ADB monitor for Nvidia Shield devices."""

    def __init__(self, shield_ip: str | None = None, adb_port: int | None = None) -> None:
        self._shield_ip = shield_ip if shield_ip is not None else settings.shield_ip
        self._adb_port = adb_port if adb_port is not None else settings.shield_adb_port
        self._last_debug_snapshot: dict[str, str] = {}

    @property
    def is_configured(self) -> bool:
        """Return whether the Shield ADB target is configured."""
        return bool(self._shield_ip)

    @property
    def serial(self) -> str | None:
        """Return the network ADB serial for the configured Shield."""
        if not self.is_configured:
            return None

        return f"{self._shield_ip}:{self._adb_port}"

    def get_state(self) -> ShieldDeviceState:
        """Return the public Shield state."""
        return self.get_state_with_debug().public_state

    def get_state_with_debug(self) -> ShieldMonitorResult:
        """Return the Shield state along with raw debug outputs."""
        if not self.is_configured:
            self._last_debug_snapshot = {}
            return ShieldMonitorResult(public_state=ShieldDeviceState(configured=False))

        warnings: list[str] = []
        debug: dict[str, str] = {}
        serial = self.serial
        assert serial is not None

        connect_result = self._run_adb("connect", serial)
        debug["adb_connect"] = connect_result.stdout or connect_result.stderr

        state_result = self._run_adb("-s", serial, "get-state")
        debug["adb_get_state"] = state_result.stdout or state_result.stderr

        if isinstance(state_result, _AdbFailure) and state_result.error in {"adb_not_found", "adb_timeout"}:
            warning_message = (
                "ADB executable is not available on the backend host."
                if state_result.error == "adb_not_found"
                else "ADB connection timed out while reading Shield state."
            )
            warnings.append(warning_message)
            state = ShieldDeviceState(configured=True, warnings=warnings)
            self._last_debug_snapshot = debug
            return ShieldMonitorResult(public_state=state, debug=debug)

        connection_state = (state_result.stdout or state_result.stderr).strip() or None
        reachable = state_result.returncode == 0 and connection_state == "device"

        if not reachable:
            warnings.append("Shield is unreachable over ADB.")
            state = ShieldDeviceState(
                configured=True,
                reachable=False,
                reachable_confidence=Confidence.INFERRED,
                adb_connected=False,
                adb_connected_confidence=Confidence.INFERRED,
                connection_state=connection_state,
                connection_state_confidence=Confidence.INFERRED if connection_state else Confidence.UNKNOWN,
                confidence=Confidence.INFERRED if connection_state else Confidence.UNKNOWN,
                warnings=warnings,
            )
            self._last_debug_snapshot = debug
            return ShieldMonitorResult(public_state=state, debug=debug)

        foreground_result = self._run_adb("-s", serial, "shell", "dumpsys window windows")
        media_session_result = self._run_adb("-s", serial, "shell", "dumpsys media_session")
        display_result = self._run_adb("-s", serial, "shell", "dumpsys display")
        audio_result = self._run_adb("-s", serial, "shell", "dumpsys audio")

        debug["foreground"] = foreground_result.stdout or foreground_result.stderr
        debug["media_session"] = media_session_result.stdout or media_session_result.stderr
        debug["display"] = display_result.stdout or display_result.stderr
        debug["audio"] = audio_result.stdout or audio_result.stderr

        foreground_package, foreground_app = self._parse_foreground(foreground_result.stdout)
        foreground_app_name = self._derive_app_name(foreground_package)
        media_session_summary = self._parse_media_session_summary(media_session_result.stdout)
        display_mode = self._parse_display_mode(display_result.stdout)

        state = ShieldDeviceState(
            configured=True,
            reachable=True,
            reachable_confidence=Confidence.INFERRED,
            adb_connected=True,
            adb_connected_confidence=Confidence.INFERRED,
            connection_state="device",
            connection_state_confidence=Confidence.INFERRED,
            foreground_app_name=foreground_app_name,
            foreground_app_name_confidence=(
                Confidence.INFERRED if foreground_app_name else Confidence.UNKNOWN
            ),
            foreground_app=foreground_app,
            foreground_app_confidence=Confidence.INFERRED if foreground_app else Confidence.UNKNOWN,
            foreground_package=foreground_package,
            foreground_package_confidence=(
                Confidence.INFERRED if foreground_package else Confidence.UNKNOWN
            ),
            media_session_summary=media_session_summary,
            media_session_summary_confidence=(
                Confidence.INFERRED if media_session_summary else Confidence.UNKNOWN
            ),
            display_mode=display_mode,
            display_mode_confidence=Confidence.INFERRED if display_mode else Confidence.UNKNOWN,
            confidence=Confidence.INFERRED,
            warnings=warnings,
        )
        self._last_debug_snapshot = debug
        return ShieldMonitorResult(public_state=state, debug=debug)

    def get_last_debug_snapshot(self) -> dict[str, str]:
        """Return the last captured raw debug outputs."""
        return dict(self._last_debug_snapshot)

    def _run_adb(self, *args: str) -> subprocess.CompletedProcess[str] | _AdbFailure:
        """Run one adb command safely and return its result."""
        try:
            return cast(
                subprocess.CompletedProcess[str],
                subprocess.run(
                ["adb", *args],
                capture_output=True,
                text=True,
                timeout=_ADB_TIMEOUT_S,
                check=False,
                ),
            )
        except FileNotFoundError:
            logger.warning("adb executable not found while reading Shield state.")
            return _AdbFailure(error="adb_not_found")
        except subprocess.TimeoutExpired:
            logger.warning("adb command timed out while reading Shield state.")
            return _AdbFailure(error="adb_timeout")

    def _parse_foreground(self, output: str) -> tuple[str | None, str | None]:
        """Parse the foreground package and activity from dumpsys output."""
        for pattern in _FOREGROUND_PATTERNS:
            match = pattern.search(output)
            if match:
                package = match.group("package")
                activity = match.group("activity")
                return package, f"{package}/{activity}"

        return None, None

    def _parse_media_session_summary(self, output: str) -> str | None:
        """Parse a compact media session summary."""
        package_match = _MEDIA_SESSION_PACKAGE_PATTERN.search(output)
        state_match = _MEDIA_SESSION_STATE_PATTERN.search(output)

        if package_match and state_match:
            return f"{package_match.group('package')} state={state_match.group('state')}"

        if package_match:
            return package_match.group("package")

        return None

    def _parse_display_mode(self, output: str) -> str | None:
        """Parse the basic display mode from dumpsys output."""
        match = _DISPLAY_MODE_PATTERN.search(output)
        if not match:
            return None

        width = match.group("width")
        height = match.group("height")
        refresh = match.group("refresh")
        return f"{width}x{height} @ {refresh}Hz"

    def _derive_app_name(self, package: str | None) -> str | None:
        """Derive a human-friendly app name from the package name."""
        if package is None:
            return None

        if package in _APP_NAME_MAP:
            return _APP_NAME_MAP[package]

        token = package.rsplit(".", maxsplit=1)[-1]
        token = token.replace("_", " ").replace("-", " ")
        return " ".join(part.capitalize() for part in token.split())


@dataclass
class _AdbFailure:
    """Synthetic adb failure result."""

    error: str
    returncode: int = 1
    stdout: str = ""
    stderr: str = ""
