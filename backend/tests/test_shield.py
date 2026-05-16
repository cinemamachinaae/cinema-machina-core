"""Tests for the read-only Nvidia Shield ADB monitor."""

from __future__ import annotations

import subprocess
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.devices.android_adb.shield import ShieldAdbMonitor
from app.main import app
from app.models.device import ShieldDeviceState
from app.models.playback import Confidence

client = TestClient(app)


def _completed(stdout: str = "", stderr: str = "", returncode: int = 0) -> subprocess.CompletedProcess[str]:
    """Build a completed subprocess result."""
    return subprocess.CompletedProcess(args=["adb"], returncode=returncode, stdout=stdout, stderr=stderr)


class TestShieldAdbMonitor:
    """Read-only Shield monitor behaviour."""

    def test_unconfigured_returns_safe_unknown_state(self) -> None:
        monitor = ShieldAdbMonitor(shield_ip="", adb_port=5555)
        state = monitor.get_state()

        assert state.configured is False
        assert state.reachable is None
        assert state.confidence == "unknown"

    def test_reachable_state_is_inferred(self) -> None:
        monitor = ShieldAdbMonitor(shield_ip="192.168.1.143", adb_port=5555)

        with patch(
            "app.devices.android_adb.shield.subprocess.run",
            side_effect=[
                _completed(stdout="already connected to 192.168.1.143:5555\n"),
                _completed(stdout="device\n"),
                _completed(
                    stdout="mCurrentFocus=Window{42 u0 com.plexapp.android/com.plexapp.plex.activities.MainActivity}\n"
                ),
                _completed(
                    stdout="package=com.plexapp.android\nstate=PlaybackState {state=3, position=12345}\n"
                ),
                _completed(
                    stdout='DisplayDeviceInfo{"Built-in Screen": uniqueId="local:0", 3840 x 2160, 60.000004 fps}\n'
                ),
                _completed(stdout="Audio routes dump\n"),
            ],
        ):
            state = monitor.get_state()

        assert state.configured is True
        assert state.reachable is True
        assert state.reachable_confidence == Confidence.INFERRED
        assert state.connection_state == "device"
        assert state.foreground_package == "com.plexapp.android"
        assert state.foreground_app == "com.plexapp.android/com.plexapp.plex.activities.MainActivity"
        assert state.media_session_summary == "com.plexapp.android state=3"
        assert state.display_mode == "3840x2160 @ 60.000004Hz"
        assert state.confidence == Confidence.INFERRED

    def test_unreachable_state_is_inferred(self) -> None:
        monitor = ShieldAdbMonitor(shield_ip="192.168.1.143", adb_port=5555)

        with patch(
            "app.devices.android_adb.shield.subprocess.run",
            side_effect=[
                _completed(stderr="failed to connect\n", returncode=1),
                _completed(stdout="offline\n", returncode=1),
            ],
        ):
            state = monitor.get_state()

        assert state.configured is True
        assert state.reachable is False
        assert state.connection_state == "offline"
        assert state.reachable_confidence == Confidence.INFERRED
        assert "Shield is unreachable over ADB." in state.warnings


class TestShieldRoute:
    """API route for Shield state."""

    def test_route_returns_200(self) -> None:
        fake_state = ShieldDeviceState(
            configured=True,
            reachable=True,
            reachable_confidence=Confidence.INFERRED,
            adb_connected=True,
            adb_connected_confidence=Confidence.INFERRED,
            foreground_app_name="Plex",
            foreground_app_name_confidence=Confidence.INFERRED,
            foreground_app="com.plexapp.android/com.plexapp.plex.activities.MainActivity",
            foreground_app_confidence=Confidence.INFERRED,
            confidence=Confidence.INFERRED,
        )

        with patch("app.api.routes.devices.ShieldAdbMonitor.get_state", return_value=fake_state):
            response = client.get("/devices/shield/state")

        assert response.status_code == 200
        assert response.json()["reachable"] is True
        assert response.json()["adb_connected"] is True
        assert response.json()["foreground_app_name"] == "Plex"
        assert response.json()["confidence"] == "inferred"
