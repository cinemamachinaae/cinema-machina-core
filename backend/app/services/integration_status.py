"""Read-only integration status checks for Plex and Jellyfin."""

from __future__ import annotations

import re
from datetime import datetime, timezone

import httpx

from app.integrations.jellyfin.client import JellyfinClient
from app.integrations.plex.client import PlexClient
from app.models.playback import Confidence
from app.models.system import IntegrationStatusState

_STATUS_TIMEOUT_S = 2.5

_SECRET_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(X-Plex-Token=)([^&\\s]+)", re.IGNORECASE),
    re.compile(r"(api_key=)([^&\\s]+)", re.IGNORECASE),
    re.compile(r"(token=)([^&\\s]+)", re.IGNORECASE),
)


def get_plex_status(client: PlexClient) -> IntegrationStatusState:
    """Return a safe Plex integration status snapshot."""
    checked_at = datetime.now(timezone.utc)
    if not client.is_configured:
        return IntegrationStatusState(
            kind="media_server",
            name="Plex",
            configured=False,
            configured_confidence=Confidence.CONFIRMED,
            reachable=None,
            reachable_confidence=Confidence.UNKNOWN,
            last_checked_at=checked_at,
            last_error_summary=None,
            last_error_confidence=Confidence.UNKNOWN,
            confidence=Confidence.UNKNOWN,
        )

    try:
        reachable = _probe_http_endpoint(client.base_url, "/identity")
        return IntegrationStatusState(
            kind="media_server",
            name="Plex",
            configured=True,
            configured_confidence=Confidence.CONFIRMED,
            reachable=reachable,
            reachable_confidence=Confidence.INFERRED,
            last_checked_at=checked_at,
            last_error_summary=None,
            last_error_confidence=Confidence.UNKNOWN,
            confidence=Confidence.INFERRED,
        )
    except Exception as exc:  # noqa: BLE001
        return IntegrationStatusState(
            kind="media_server",
            name="Plex",
            configured=True,
            configured_confidence=Confidence.CONFIRMED,
            reachable=False,
            reachable_confidence=Confidence.INFERRED,
            last_checked_at=checked_at,
            last_error_summary=_sanitize_error(str(exc)),
            last_error_confidence=Confidence.INFERRED,
            confidence=Confidence.INFERRED,
        )


def get_jellyfin_status(client: JellyfinClient) -> IntegrationStatusState:
    """Return a safe Jellyfin integration status snapshot."""
    checked_at = datetime.now(timezone.utc)
    if not client.is_configured:
        return IntegrationStatusState(
            kind="media_server",
            name="Jellyfin",
            configured=False,
            configured_confidence=Confidence.CONFIRMED,
            reachable=None,
            reachable_confidence=Confidence.UNKNOWN,
            last_checked_at=checked_at,
            last_error_summary=None,
            last_error_confidence=Confidence.UNKNOWN,
            confidence=Confidence.UNKNOWN,
        )

    try:
        reachable = _probe_http_endpoint(client.base_url, "/System/Info/Public")
        return IntegrationStatusState(
            kind="media_server",
            name="Jellyfin",
            configured=True,
            configured_confidence=Confidence.CONFIRMED,
            reachable=reachable,
            reachable_confidence=Confidence.INFERRED,
            last_checked_at=checked_at,
            last_error_summary=None,
            last_error_confidence=Confidence.UNKNOWN,
            confidence=Confidence.INFERRED,
        )
    except Exception as exc:  # noqa: BLE001
        return IntegrationStatusState(
            kind="media_server",
            name="Jellyfin",
            configured=True,
            configured_confidence=Confidence.CONFIRMED,
            reachable=False,
            reachable_confidence=Confidence.INFERRED,
            last_checked_at=checked_at,
            last_error_summary=_sanitize_error(str(exc)),
            last_error_confidence=Confidence.INFERRED,
            confidence=Confidence.INFERRED,
        )


def _probe_http_endpoint(base_url: str, path: str) -> bool:
    """Return True if the endpoint responds within the timeout."""
    url = f"{base_url.rstrip('/')}{path}"
    with httpx.Client(timeout=_STATUS_TIMEOUT_S, follow_redirects=True) as http:
        # Any HTTP response is considered reachability evidence.
        response = http.get(url)
    return response.status_code > 0


def _sanitize_error(message: str) -> str:
    """Sanitize errors to avoid leaking tokens, API keys, or .env-derived URLs."""
    cleaned = message.strip()
    if not cleaned:
        return "Integration request failed."

    for pattern in _SECRET_PATTERNS:
        cleaned = pattern.sub(r"\1[REDACTED]", cleaned)

    # Avoid returning full URLs which may include local IPs.
    cleaned = re.sub(r"https?://\S+", "[REDACTED_URL]", cleaned)

    return cleaned[:180]
