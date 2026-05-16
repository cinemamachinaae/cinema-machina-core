"""Playback API route — GET /playback/current.

This route delegates to the Plex and Jellyfin integration clients and
aggregates their results. It never crashes: if both integrations are
unconfigured, it returns an empty sessions list with appropriate
``sources_checked`` metadata.

Business logic lives in the integration clients, not here.
See AGENTS.md §8.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.integrations.jellyfin.client import JellyfinClient
from app.integrations.plex.client import PlexClient
from app.models.playback import PlaybackCurrentResponse, PlaybackSource

router = APIRouter(prefix="/playback", tags=["playback"])

logger = logging.getLogger(__name__)

# Module-level client instances.  Both are safe to construct even when
# credentials are absent — they log a warning and return empty state.
_plex = PlexClient()
_jellyfin = JellyfinClient()


@router.get("/current", response_model=PlaybackCurrentResponse)
def get_current_playback() -> PlaybackCurrentResponse:
    """Return all active playback sessions across configured sources.

    Queries Plex and Jellyfin (when configured) and merges the results
    into a single response. Each session carries a ``confidence`` field
    indicating how certain the data is.

    Returns:
        ``PlaybackCurrentResponse`` with zero or more ``SessionState``
        objects and a list of sources that were checked.

    Raises:
        Nothing — all errors are caught and surfaced in the
        ``error`` field of the response.
    """
    sessions = []
    sources_checked: list[PlaybackSource] = []
    error_messages: list[str] = []

    # --- Plex ---
    if _plex.is_configured:
        sources_checked.append(PlaybackSource.PLEX)
        try:
            plex_sessions = _plex.get_active_sessions()
            sessions.extend(plex_sessions)
        except Exception as exc:  # noqa: BLE001
            logger.error("Plex session fetch failed: %s", exc)
            error_messages.append(f"plex: {exc}")
    else:
        logger.debug("Plex not configured — skipping.")

    # --- Jellyfin ---
    if _jellyfin.is_configured:
        sources_checked.append(PlaybackSource.JELLYFIN)
        try:
            jf_sessions = _jellyfin.get_active_sessions()
            sessions.extend(jf_sessions)
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
