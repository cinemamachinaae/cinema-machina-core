"""Tests for the unified playback chain snapshot endpoint."""

from __future__ import annotations

from unittest.mock import PropertyMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import chain_snapshot
from app.models.playback import (
    AudioState,
    Confidence,
    PlaybackDecision,
    PlaybackSource,
    SessionState,
    VideoState,
)

client = TestClient(app)


class TestChainCurrentUnconfigured:
    """Behaviour of /chain/current when no integrations are configured."""

    def test_returns_200(self) -> None:
        response = client.get("/chain/current")
        assert response.status_code == 200

    def test_active_is_false(self) -> None:
        response = client.get("/chain/current")
        assert response.json()["active"] is False

    def test_confidence_is_unknown(self) -> None:
        response = client.get("/chain/current")
        assert response.json()["confidence"] == "unknown"

    def test_expected_empty_shape(self) -> None:
        response = client.get("/chain/current")
        data = response.json()

        assert data["source"] is None
        assert data["media_server"] is None
        assert data["playback_client"] is None
        assert data["display_device"] is None
        assert data["audio_device"] is None
        assert data["warnings"] == []


class TestChainCurrentConfiguredSession:
    """Chain snapshot uses real session data when an active session exists."""

    def test_active_session_populates_source_and_client(self) -> None:
        session = SessionState(
            source=PlaybackSource.PLEX,
            is_playing=True,
            title="Dune: Part Two",
            user="rahul",
            client_name="SHIELD Android TV",
            decision=PlaybackDecision.DIRECT_PLAY,
            video=VideoState(
                codec="hevc",
                container="mkv",
                resolution="4k",
                bitrate_kbps=80000,
                confidence=Confidence.CONFIRMED,
            ),
            audio=AudioState(codec="truehd", channels=8, confidence=Confidence.CONFIRMED),
            confidence=Confidence.CONFIRMED,
        )

        with (
            patch.object(
                type(chain_snapshot._plex),
                "is_configured",
                new_callable=PropertyMock,
                return_value=True,
            ),
            patch.object(
                type(chain_snapshot._jellyfin),
                "is_configured",
                new_callable=PropertyMock,
                return_value=False,
            ),
            patch("app.services.chain_snapshot._plex.get_active_sessions", return_value=[session]),
        ):
            response = client.get("/chain/current")

        assert response.status_code == 200
        data = response.json()
        assert data["active"] is True
        assert data["confidence"] == "unknown"
        assert data["source"]["codec"] == "hevc"
        assert data["source"]["container"] == "mkv"
        assert data["source"]["audio_codec"] == "truehd"
        assert data["media_server"]["kind"] == "plex"
        assert data["playback_client"]["kind"] == "nvidia_shield"
        assert data["output_state"]["video_mode"] is None
