"""Jellyfin server integration client — Phase 2 scaffold.

This module provides a safe, non-crashing interface to the Jellyfin
session API. At this stage it returns ``unknown`` state when:

- ``JELLYFIN_URL`` or ``JELLYFIN_API_KEY`` are not configured.
- The Jellyfin server is unreachable.
- No active session is found.

No real HTTP calls to Jellyfin are made yet. Full session parsing
will be added in a later Phase 2 iteration.

See AGENTS.md §3 for the confidence model.
"""

from __future__ import annotations

import logging

from app.config.settings import settings
from app.models.playback import (
    AudioState,
    Confidence,
    PlaybackDecision,
    PlaybackSource,
    SessionState,
    VideoState,
)

logger = logging.getLogger(__name__)


class JellyfinClient:
    """Interface to the Jellyfin server session API.

    All public methods must:
    - Never raise an unhandled exception.
    - Return a well-typed response with appropriate ``confidence``.
    - Log errors at WARNING or ERROR level, never silently swallow them.

    Attributes:
        _url: Jellyfin server base URL from settings.
        _api_key: Jellyfin API key from settings.
        _configured: True only when both URL and API key are present.
    """

    def __init__(self) -> None:
        """Initialise the client using values from ``settings``."""
        self._url: str | None = settings.jellyfin_url
        self._api_key: str | None = settings.jellyfin_api_key
        self._configured: bool = bool(self._url and self._api_key)

        if not self._configured:
            logger.warning(
                "JellyfinClient: JELLYFIN_URL or JELLYFIN_API_KEY not configured — "
                "sessions will return unknown state."
            )

    @property
    def is_configured(self) -> bool:
        """Return True if credentials are present in settings."""
        return self._configured

    @property
    def base_url(self) -> str:
        """Return the configured base URL without exposing the API key."""
        return (self._url or "").strip()

    def get_active_sessions(self) -> list[SessionState]:
        """Fetch active Jellyfin playback sessions.

        Returns:
            A list of ``SessionState`` objects. Returns an empty list
            when credentials are absent or an error occurs. Never raises.

        Note:
            Real HTTP calls to the Jellyfin ``/Sessions`` endpoint
            will be added in a future iteration. This scaffold returns
            an empty list to keep the API contract stable.
        """
        if not self._configured:
            return []

        # TODO (Phase 2 iteration 2): implement real Jellyfin session fetch
        # via GET {jellyfin_url}/Sessions?api_key={api_key}&ControllableByUserId=...
        # Parse JSON list into SessionState objects.
        logger.info("JellyfinClient.get_active_sessions: placeholder — no real call yet.")
        return []

    def _build_unknown_session(self) -> SessionState:
        """Build a fully-unknown session state for safe fallback.

        Returns:
            A ``SessionState`` with all fields at their unknown defaults
            and ``source=jellyfin``.
        """
        return SessionState(
            source=PlaybackSource.JELLYFIN,
            is_playing=False,
            decision=PlaybackDecision.UNKNOWN,
            video=VideoState(confidence=Confidence.UNKNOWN),
            audio=AudioState(confidence=Confidence.UNKNOWN),
            confidence=Confidence.UNKNOWN,
        )
