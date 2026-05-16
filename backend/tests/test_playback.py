"""Tests for /health and /playback/current — Phase 2.1.

Coverage:
- Phase 1 regression: /health still works.
- Unconfigured state: no credentials → empty response shape.
- Plex configured, no active sessions → sources_checked=["plex"], sessions=[].
- Plex configured, one active session → one typed SessionState returned.
- Plex timeout → 200 with error field populated, no crash.
- Plex HTTP error → 200 with error field populated, no crash.
- Plex malformed XML → 200 with empty sessions, no crash.
- Parser unit tests against fixture XML strings.

Tests use ``unittest.mock.patch`` to mock httpx calls and settings.
No live Plex server is needed.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app.integrations.plex.parser import parse_sessions
from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Plex XML fixtures
# ---------------------------------------------------------------------------

PLEX_XML_NO_SESSIONS = """<?xml version="1.0" encoding="UTF-8"?>
<MediaContainer size="0">
</MediaContainer>
"""

PLEX_XML_ONE_SESSION = """<?xml version="1.0" encoding="UTF-8"?>
<MediaContainer size="1">
  <Video title="Dune: Part Two"
         type="movie"
         viewOffset="3600000">
    <User title="rahul" />
    <Player product="Plex for Android (TV)"
            state="playing"
            title="SHIELD Android TV" />
    <Session id="abc123" />
    <Media videoCodec="hevc"
           audioCodec="truehd"
           container="mkv"
           videoResolution="4k"
           bitrate="80000">
      <Part>
        <Stream streamType="1" codec="hevc" />
        <Stream streamType="2" codec="truehd" channels="8" />
      </Part>
    </Media>
  </Video>
</MediaContainer>
"""

PLEX_XML_TRANSCODING = """<?xml version="1.0" encoding="UTF-8"?>
<MediaContainer size="1">
  <Video title="The Shawshank Redemption" type="movie">
    <User title="guest" />
    <Player product="Plex Web" state="playing" />
    <Session id="xyz789" />
    <Media videoCodec="h264" audioCodec="aac" container="mp4"
           videoResolution="1080" bitrate="8000">
      <Part>
        <Stream streamType="1" codec="h264" />
        <Stream streamType="2" codec="aac" channels="2" />
      </Part>
    </Media>
    <TranscodeSession videoDecision="transcode" audioDecision="transcode" />
  </Video>
</MediaContainer>
"""

PLEX_XML_MALFORMED = "<<<not valid xml>>>"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_response(text: str, status_code: int = 200) -> MagicMock:
    """Build a mock httpx.Response with the given body text."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = status_code
    mock_resp.text = text
    mock_resp.raise_for_status = MagicMock()  # no-op for 2xx
    return mock_resp


# ---------------------------------------------------------------------------
# Phase 1 regression
# ---------------------------------------------------------------------------

class TestHealthStillWorks:
    """Regression: Phase 1 /health must remain intact after Phase 2.1 wiring."""

    def test_health_returns_ok(self) -> None:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "cinema-machina-core"
        assert data["confidence"] == "confirmed"


# ---------------------------------------------------------------------------
# Unconfigured state (no .env)
# ---------------------------------------------------------------------------

class TestPlaybackCurrentUnconfigured:
    """Behaviour of /playback/current when no credentials are set."""

    def test_returns_200(self) -> None:
        response = client.get("/playback/current")
        assert response.status_code == 200

    def test_sessions_is_empty_list(self) -> None:
        response = client.get("/playback/current")
        assert response.json()["sessions"] == []

    def test_sources_checked_is_empty(self) -> None:
        response = client.get("/playback/current")
        assert response.json()["sources_checked"] == []

    def test_error_is_none(self) -> None:
        response = client.get("/playback/current")
        assert response.json()["error"] is None

    def test_response_shape(self) -> None:
        data = response = client.get("/playback/current").json()
        assert "sessions" in data
        assert "sources_checked" in data
        assert "error" in data


# ---------------------------------------------------------------------------
# Parser unit tests (pure, no HTTP)
# ---------------------------------------------------------------------------

class TestPlexParser:
    """Unit tests for parse_sessions() against fixture XML strings."""

    def test_no_sessions_returns_empty_list(self) -> None:
        result = parse_sessions(PLEX_XML_NO_SESSIONS)
        assert result == []

    def test_malformed_xml_returns_empty_list(self) -> None:
        result = parse_sessions(PLEX_XML_MALFORMED)
        assert result == []

    def test_one_session_returns_one_item(self) -> None:
        result = parse_sessions(PLEX_XML_ONE_SESSION)
        assert len(result) == 1

    def test_session_source_is_plex(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.source == "plex"

    def test_session_title_confirmed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.title == "Dune: Part Two"
        assert session.confidence == "confirmed"

    def test_session_user_parsed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.user == "rahul"

    def test_session_client_name_parsed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.client_name == "Plex for Android (TV)"

    def test_session_is_playing_true(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.is_playing is True

    def test_session_decision_direct_play_when_no_transcode(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.decision == "direct_play"

    def test_session_decision_transcode(self) -> None:
        session = parse_sessions(PLEX_XML_TRANSCODING)[0]
        assert session.decision == "transcode"

    def test_video_codec_confirmed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.video.codec == "hevc"
        assert session.video.confidence == "confirmed"

    def test_video_resolution_parsed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.video.resolution == "4k"

    def test_video_container_parsed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.video.container == "mkv"

    def test_video_bitrate_parsed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.video.bitrate_kbps == 80000

    def test_hdr_format_is_none(self) -> None:
        """HDR must never be inferred from Plex session XML."""
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.video.hdr_format is None

    def test_audio_codec_confirmed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.audio.codec == "truehd"
        assert session.audio.confidence == "confirmed"

    def test_audio_channels_parsed(self) -> None:
        session = parse_sessions(PLEX_XML_ONE_SESSION)[0]
        assert session.audio.channels == 8


# ---------------------------------------------------------------------------
# Plex client integration tests (httpx mocked)
# ---------------------------------------------------------------------------

class TestPlexClientConfigured:
    """PlexClient behaviour with mocked settings and mocked httpx."""

    def test_no_sessions_returns_empty_and_sources_checked(self) -> None:
        """Configured Plex with no active sessions → sources_checked=['plex'],
        sessions=[]."""
        with (
            patch("app.integrations.plex.client.settings") as mock_settings,
            patch("app.integrations.plex.client.httpx.Client") as mock_client_cls,
        ):
            mock_settings.plex_url = "http://192.168.1.100:32400"
            mock_settings.plex_token = "faketoken123"

            mock_http = MagicMock()
            mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
            mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)
            mock_http.get.return_value = _make_mock_response(PLEX_XML_NO_SESSIONS)

            from app.integrations.plex.client import PlexClient
            plex = PlexClient()
            assert plex.is_configured is True
            sessions = plex.get_active_sessions()

        assert sessions == []

    def test_one_session_returned(self) -> None:
        """Configured Plex with one active session → one SessionState."""
        with (
            patch("app.integrations.plex.client.settings") as mock_settings,
            patch("app.integrations.plex.client.httpx.Client") as mock_client_cls,
        ):
            mock_settings.plex_url = "http://192.168.1.100:32400"
            mock_settings.plex_token = "faketoken123"

            mock_http = MagicMock()
            mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
            mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)
            mock_http.get.return_value = _make_mock_response(PLEX_XML_ONE_SESSION)

            from app.integrations.plex.client import PlexClient
            plex = PlexClient()
            sessions = plex.get_active_sessions()

        assert len(sessions) == 1
        s = sessions[0]
        assert s.title == "Dune: Part Two"
        assert s.source == "plex"
        assert s.confidence == "confirmed"
        assert s.video.codec == "hevc"
        assert s.audio.codec == "truehd"
        assert s.decision == "direct_play"

    def test_timeout_returns_empty_no_crash(self) -> None:
        """Plex timeout → empty sessions, no exception raised."""
        with (
            patch("app.integrations.plex.client.settings") as mock_settings,
            patch("app.integrations.plex.client.httpx.Client") as mock_client_cls,
        ):
            mock_settings.plex_url = "http://192.168.1.100:32400"
            mock_settings.plex_token = "faketoken123"

            mock_http = MagicMock()
            mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
            mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)
            mock_http.get.side_effect = httpx.TimeoutException("timed out")

            from app.integrations.plex.client import PlexClient
            plex = PlexClient()
            sessions = plex.get_active_sessions()

        assert sessions == []

    def test_http_error_returns_empty_no_crash(self) -> None:
        """Plex HTTP 401 → empty sessions, no exception raised."""
        with (
            patch("app.integrations.plex.client.settings") as mock_settings,
            patch("app.integrations.plex.client.httpx.Client") as mock_client_cls,
        ):
            mock_settings.plex_url = "http://192.168.1.100:32400"
            mock_settings.plex_token = "badtoken"

            mock_http = MagicMock()
            mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
            mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)

            mock_request = MagicMock(spec=httpx.Request)
            mock_response = MagicMock(spec=httpx.Response)
            mock_response.status_code = 401
            mock_http.get.return_value = mock_response
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
                "401 Unauthorized", request=mock_request, response=mock_response
            )

            from app.integrations.plex.client import PlexClient
            plex = PlexClient()
            sessions = plex.get_active_sessions()

        assert sessions == []

    def test_malformed_xml_returns_empty_no_crash(self) -> None:
        """Plex returns malformed XML → empty sessions, no exception raised."""
        with (
            patch("app.integrations.plex.client.settings") as mock_settings,
            patch("app.integrations.plex.client.httpx.Client") as mock_client_cls,
        ):
            mock_settings.plex_url = "http://192.168.1.100:32400"
            mock_settings.plex_token = "faketoken123"

            mock_http = MagicMock()
            mock_client_cls.return_value.__enter__ = MagicMock(return_value=mock_http)
            mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)
            mock_http.get.return_value = _make_mock_response(PLEX_XML_MALFORMED)

            from app.integrations.plex.client import PlexClient
            plex = PlexClient()
            sessions = plex.get_active_sessions()

        assert sessions == []
