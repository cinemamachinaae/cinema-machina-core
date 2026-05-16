"""Business logic for current playback aggregation."""

from __future__ import annotations

import logging

from app.integrations.jellyfin.client import JellyfinClient
from app.integrations.plex.client import PlexClient
from app.models.playback import PlaybackCurrentResponse, PlaybackSource

logger = logging.getLogger(__name__)

_plex = PlexClient()
_jellyfin = JellyfinClient()


def get_current_playback_snapshot() -> PlaybackCurrentResponse:
    """Return all active playback sessions across configured sources."""
    sessions = []
    sources_checked: list[PlaybackSource] = []
    error_messages: list[str] = []

    if _plex.is_configured:
        sources_checked.append(PlaybackSource.PLEX)
        try:
            sessions.extend(_plex.get_active_sessions())
        except Exception as exc:  # noqa: BLE001
            logger.error("Plex session fetch failed: %s", exc)
            error_messages.append(f"plex: {exc}")
    else:
        logger.debug("Plex not configured — skipping.")

    if _jellyfin.is_configured:
        sources_checked.append(PlaybackSource.JELLYFIN)
        try:
            sessions.extend(_jellyfin.get_active_sessions())
        except Exception as exc:  # noqa: BLE001
            logger.error("Jellyfin session fetch failed: %s", exc)
            error_messages.append(f"jellyfin: {exc}")
    else:
        logger.debug("Jellyfin not configured — skipping.")

    return PlaybackCurrentResponse(
        sessions=sessions,
        sources_checked=sources_checked,
        error="; ".join(error_messages) if error_messages else None,
    )
