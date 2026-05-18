"""Tests for read-only Plex/Jellyfin integration status checks."""

from __future__ import annotations

from unittest.mock import patch

from app.integrations.jellyfin.client import JellyfinClient
from app.integrations.plex.client import PlexClient
from app.models.playback import Confidence
from app.services.integration_status import get_jellyfin_status, get_plex_status


class TestIntegrationStatus:
    def test_plex_unconfigured_returns_unknown(self) -> None:
        with patch("app.integrations.plex.client.settings") as mock_settings:
            mock_settings.plex_url = None
            mock_settings.plex_token = None
            plex = PlexClient()

        status = get_plex_status(plex)
        assert status.configured is False
        assert status.reachable is None
        assert status.reachable_confidence == Confidence.UNKNOWN
        assert status.last_error_summary is None
        assert status.confidence == Confidence.UNKNOWN

    def test_jellyfin_unconfigured_returns_unknown(self) -> None:
        with patch("app.integrations.jellyfin.client.settings") as mock_settings:
            mock_settings.jellyfin_url = None
            mock_settings.jellyfin_api_key = None
            jellyfin = JellyfinClient()

        status = get_jellyfin_status(jellyfin)
        assert status.configured is False
        assert status.reachable is None
        assert status.reachable_confidence == Confidence.UNKNOWN
        assert status.last_error_summary is None
        assert status.confidence == Confidence.UNKNOWN

    def test_reachable_is_inferred_when_probe_succeeds(self) -> None:
        with patch("app.integrations.plex.client.settings") as mock_settings:
            mock_settings.plex_url = "http://127.0.0.1:32400"
            mock_settings.plex_token = "secretToken"
            plex = PlexClient()

        with patch("app.services.integration_status._probe_http_endpoint", return_value=True):
            status = get_plex_status(plex)

        assert status.configured is True
        assert status.reachable is True
        assert status.reachable_confidence == Confidence.INFERRED
        assert status.last_error_summary is None

    def test_error_summary_is_sanitized(self) -> None:
        with patch("app.integrations.plex.client.settings") as mock_settings:
            mock_settings.plex_url = "http://127.0.0.1:32400"
            mock_settings.plex_token = "secretToken"
            plex = PlexClient()

        error_message = (
            "GET http://127.0.0.1:32400/status/sessions?X-Plex-Token=secretToken failed"
        )
        with patch(
            "app.services.integration_status._probe_http_endpoint",
            side_effect=ValueError(error_message),
        ):
            status = get_plex_status(plex)

        assert status.reachable is False
        assert status.last_error_summary is not None
        assert "secretToken" not in status.last_error_summary
        assert "http://" not in status.last_error_summary
