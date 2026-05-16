"""Plex Media Server integration client — Phase 2 scaffold.

This module provides a safe, non-crashing interface to the Plex
session API. At this stage it returns ``unknown`` state when:

- ``PLEX_URL`` or ``PLEX_TOKEN`` are not configured.
- The Plex server is unreachable.
- No active session is found.

No real HTTP calls to Plex are made yet. Full session parsing
will be added in a later Phase 2 iteration.

See SKILLS.md §12 for Plex-specific rules.
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


class PlexClient:
    """Interface to the Plex Media Server session API.

    All public methods must:
    - Never raise an unhandled exception.
    - Return a well-typed response with appropriate ``confidence``.
    - Log errors at WARNING or ERROR level, never silently swallow them.

    Attributes:
        _url: Plex server base URL from settings.
        _token: Plex authentication token from settings.
        _configured: True only when both URL and token are present.
    """

    def __init__(self) -> None:
        """Initialise the client using values from ``settings``."""
        self._url: str | None = settings.plex_url
        self._token: str | None = settings.plex_token
        self._configured: bool = bool(self._url and self._token)

        if not self._configured:
            logger.warning(
                "PlexClient: PLEX_URL or PLEX_TOKEN not configured — "
                "sessions will return unknown state."
            )

    @property
    def is_configured(self) -> bool:
        """Return True if credentials are present in settings."""
        return self._configured

    def get_active_sessions(self) -> list[SessionState]:
        """Fetch active Plex playback sessions.

        Returns:
            A list of ``SessionState`` objects. Returns an empty list
            with ``confidence=unknown`` when credentials are absent or
            an error occurs. Never raises.

        Note:
            Real HTTP calls to the Plex ``/status/sessions`` endpoint
            will be added in a future iteration. This scaffold returns
            an empty list to keep the API contract stable.
        """
        if not self._configured:
            return []

        # TODO (Phase 2 iteration 2): implement real Plex session fetch
        # via GET {plex_url}/status/sessions?X-Plex-Token={token}
        # Parse MediaContainer → Video elements into SessionState objects.
        logger.info("PlexClient.get_active_sessions: placeholder — no real call yet.")
        return []

    def _build_unknown_session(self) -> SessionState:
        """Build a fully-unknown session state for safe fallback.

        Returns:
            A ``SessionState`` with all fields at their unknown defaults
            and ``source=plex``.
        """
        return SessionState(
            source=PlaybackSource.PLEX,
            is_playing=False,
            decision=PlaybackDecision.UNKNOWN,
            video=VideoState(confidence=Confidence.UNKNOWN),
            audio=AudioState(confidence=Confidence.UNKNOWN),
            confidence=Confidence.UNKNOWN,
        )
