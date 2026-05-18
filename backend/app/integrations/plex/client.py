"""Plex Media Server integration client — Phase 2.1.

Makes a real HTTP call to ``/status/sessions`` when credentials are
configured. Returns ``unknown`` / empty state safely when:

- ``PLEX_URL`` or ``PLEX_TOKEN`` are not configured.
- The Plex server is unreachable or times out.
- No active session is found.
- The response XML is malformed.

Token is passed as a query parameter (Plex standard). It is never
written to logs — only the sanitised base URL is logged.

See SKILLS.md §12 for Plex-specific rules.
See AGENTS.md §3 for the confidence model.
"""

from __future__ import annotations

import logging

import httpx

from app.config.settings import settings
from app.integrations.plex.parser import parse_sessions
from app.models.playback import (
    AudioState,
    Confidence,
    PlaybackDecision,
    PlaybackSource,
    SessionState,
    VideoState,
)

logger = logging.getLogger(__name__)

# Hard timeout for all Plex API calls.  Plex is local, so 5 s is generous.
_PLEX_TIMEOUT_S: float = 5.0

# Plex requires this Accept header to guarantee XML (not JSON) responses.
_PLEX_HEADERS: dict[str, str] = {
    "Accept": "application/xml",
    "X-Plex-Client-Identifier": "cinema-machina-core",
}


class PlexClient:
    """Interface to the Plex Media Server session API.

    All public methods must:
    - Never raise an unhandled exception.
    - Return a well-typed response with appropriate ``confidence``.
    - Log errors at WARNING or ERROR level, never silently swallow them.
    - Never write the Plex token to any log line.

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

    @property
    def base_url(self) -> str:
        """Return the configured base URL without exposing the token."""
        return (self._url or "").strip()

    def get_active_sessions(self) -> list[SessionState]:
        """Fetch active Plex playback sessions.

        Makes a synchronous GET request to ``{plex_url}/status/sessions``
        with the token as a query parameter. Parses the XML response and
        returns typed ``SessionState`` objects.

        Returns:
            A list of ``SessionState`` objects — one per active session.
            Returns an empty list on no active sessions, unconfigured
            credentials, network errors, or parse failures. Never raises.

        Raises:
            Nothing — all errors are caught, logged, and result in an
            empty return value. The caller (route handler) catches any
            residual exceptions as an extra safety net.
        """
        if not self._configured:
            return []

        # Safety assertion — mypy: both are str at this point.
        assert self._url is not None
        assert self._token is not None

        endpoint = f"{self._url.rstrip('/')}/status/sessions"
        # Log base URL only — never log the token.
        logger.info("PlexClient: fetching sessions from %s", endpoint)

        try:
            with httpx.Client(timeout=_PLEX_TIMEOUT_S) as http:
                response = http.get(
                    endpoint,
                    params={"X-Plex-Token": self._token},
                    headers=_PLEX_HEADERS,
                )
            response.raise_for_status()
        except httpx.TimeoutException:
            logger.error(
                "PlexClient: request timed out after %.1f s — %s",
                _PLEX_TIMEOUT_S,
                endpoint,
            )
            return []
        except httpx.HTTPStatusError as exc:
            logger.error(
                "PlexClient: HTTP %s from Plex — %s",
                exc.response.status_code,
                endpoint,
            )
            return []
        except httpx.HTTPError as exc:
            logger.error("PlexClient: network error — %s", exc)
            return []
        except Exception as exc:  # noqa: BLE001
            logger.error("PlexClient: unexpected error — %s", exc)
            return []

        return parse_sessions(response.text)

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
