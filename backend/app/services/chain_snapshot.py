"""Business logic for the unified playback chain snapshot."""

from __future__ import annotations

import logging

from app.devices.android_adb.shield import ShieldAdbMonitor
from app.integrations.jellyfin.client import JellyfinClient
from app.integrations.plex.client import PlexClient
from app.models.chain import ChainSnapshotResponse, OutputState, SourceMediaState
from app.models.device import (
    AudioDeviceState,
    DisplayDeviceState,
    MediaServerKind,
    MediaServerState,
    PlaybackClientKind,
    PlaybackClientState,
    ShieldDeviceState,
)
from app.models.playback import Confidence, PlaybackSource, SessionState

logger = logging.getLogger(__name__)

_plex = PlexClient()
_jellyfin = JellyfinClient()
_shield = ShieldAdbMonitor()

_CLIENT_KIND_MAP: tuple[tuple[str, PlaybackClientKind], ...] = (
    ("shield", PlaybackClientKind.NVIDIA_SHIELD),
    ("zidoo", PlaybackClientKind.ZIDOO),
    ("dune", PlaybackClientKind.DUNE),
    ("apple tv", PlaybackClientKind.APPLE_TV),
    ("fire tv", PlaybackClientKind.FIRE_TV),
    ("google tv", PlaybackClientKind.GOOGLE_TV),
)

_MEDIA_SERVER_NAME_MAP: dict[PlaybackSource, str] = {
    PlaybackSource.PLEX: "Plex",
    PlaybackSource.JELLYFIN: "Jellyfin",
}

_MEDIA_SERVER_KIND_MAP: dict[PlaybackSource, MediaServerKind] = {
    PlaybackSource.PLEX: MediaServerKind.PLEX,
    PlaybackSource.JELLYFIN: MediaServerKind.JELLYFIN,
}


def get_current_chain_snapshot() -> ChainSnapshotResponse:
    """Build the current playback chain snapshot from available sources."""
    warnings: list[str] = []
    sessions: list[SessionState] = []

    sessions.extend(_get_sessions_from_client(_plex, "plex", warnings))
    sessions.extend(_get_sessions_from_client(_jellyfin, "jellyfin", warnings))

    active_session = next((session for session in sessions if session.is_playing), None)
    if active_session is None:
        return ChainSnapshotResponse(
            active=False,
            confidence=Confidence.UNKNOWN,
            source=None,
            media_server=None,
            playback_client=None,
            display_device=None,
            audio_device=None,
            output_state=None,
            warnings=warnings,
        )

    warnings.extend(
        [
            "Display device state is currently unknown.",
            "Audio device state is currently unknown.",
            "Output signal state is currently unknown.",
        ]
    )

    shield_state = _get_shield_state_for_chain(active_session, warnings)

    return ChainSnapshotResponse(
        active=True,
        confidence=Confidence.UNKNOWN,
        source=_build_source_state(active_session),
        media_server=_build_media_server_state(active_session),
        playback_client=_build_playback_client_state(active_session, shield_state),
        display_device=DisplayDeviceState(),
        audio_device=AudioDeviceState(),
        output_state=OutputState(),
        warnings=warnings,
    )


def _get_sessions_from_client(
    client: PlexClient | JellyfinClient,
    source_name: str,
    warnings: list[str],
) -> list[SessionState]:
    """Safely read active sessions from one integration client."""
    if not client.is_configured:
        logger.debug("%s not configured for chain snapshot.", source_name)
        return []

    try:
        return client.get_active_sessions()
    except Exception as exc:  # noqa: BLE001
        logger.error("%s chain snapshot fetch failed: %s", source_name, exc)
        warnings.append(f"{source_name} session data is unavailable.")
        return []


def _build_source_state(session: SessionState) -> SourceMediaState:
    """Build source media state from the active session."""
    return SourceMediaState(
        codec=session.video.codec,
        codec_confidence=session.video.confidence,
        container=session.video.container,
        container_confidence=(
            session.video.confidence if session.video.container is not None else Confidence.UNKNOWN
        ),
        bitrate_kbps=session.video.bitrate_kbps,
        bitrate_confidence=(
            session.video.confidence
            if session.video.bitrate_kbps is not None
            else Confidence.UNKNOWN
        ),
        hdr_format=session.video.hdr_format,
        hdr_confidence=(
            session.video.confidence if session.video.hdr_format is not None else Confidence.UNKNOWN
        ),
        audio_codec=session.audio.codec,
        audio_codec_confidence=(
            session.audio.confidence if session.audio.codec is not None else Confidence.UNKNOWN
        ),
    )


def _build_media_server_state(session: SessionState) -> MediaServerState | None:
    """Build media server state from the active session."""
    if session.source not in _MEDIA_SERVER_NAME_MAP:
        return None

    return MediaServerState(
        name=_MEDIA_SERVER_NAME_MAP[session.source],
        name_confidence=Confidence.CONFIRMED,
        kind=_MEDIA_SERVER_KIND_MAP[session.source],
        kind_confidence=Confidence.CONFIRMED,
    )


def _build_playback_client_state(
    session: SessionState,
    shield_state: ShieldDeviceState | None,
) -> PlaybackClientState | None:
    """Build playback client state from the active session."""
    if session.client_name is None:
        if shield_state is None:
            return None

        return PlaybackClientState(
            name="Nvidia Shield",
            name_confidence=Confidence.INFERRED,
            kind=PlaybackClientKind.NVIDIA_SHIELD,
            kind_confidence=Confidence.INFERRED,
            reachable=shield_state.reachable,
            reachable_confidence=shield_state.reachable_confidence,
            foreground_app=shield_state.foreground_app,
            foreground_app_confidence=shield_state.foreground_app_confidence,
            foreground_package=shield_state.foreground_package,
            foreground_package_confidence=shield_state.foreground_package_confidence,
        )

    client_kind = _infer_playback_client_kind(session.client_name)
    return PlaybackClientState(
        name=session.client_name,
        name_confidence=Confidence.CONFIRMED,
        kind=client_kind,
        kind_confidence=Confidence.INFERRED if client_kind is not None else Confidence.UNKNOWN,
        reachable=shield_state.reachable if shield_state is not None else None,
        reachable_confidence=(
            shield_state.reachable_confidence if shield_state is not None else Confidence.UNKNOWN
        ),
        foreground_app=shield_state.foreground_app if shield_state is not None else None,
        foreground_app_confidence=(
            shield_state.foreground_app_confidence
            if shield_state is not None
            else Confidence.UNKNOWN
        ),
        foreground_package=(
            shield_state.foreground_package if shield_state is not None else None
        ),
        foreground_package_confidence=(
            shield_state.foreground_package_confidence
            if shield_state is not None
            else Confidence.UNKNOWN
        ),
    )


def _infer_playback_client_kind(client_name: str) -> PlaybackClientKind | None:
    """Infer the client platform from a reported client name."""
    name = client_name.lower()

    for marker, client_kind in _CLIENT_KIND_MAP:
        if marker in name:
            return client_kind

    return None


def _get_shield_state_for_chain(
    session: SessionState,
    warnings: list[str],
) -> ShieldDeviceState | None:
    """Return Shield state when the active session appears to be on Shield."""
    if not _shield.is_configured:
        return None

    client_name = (session.client_name or "").lower()
    client_kind = _infer_playback_client_kind(session.client_name or "")
    is_shield_session = "shield" in client_name or client_kind == PlaybackClientKind.NVIDIA_SHIELD
    if not is_shield_session:
        return None

    shield_state = _shield.get_state()
    warnings.extend(shield_state.warnings)
    return shield_state
