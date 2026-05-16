"""Tests for GET /playback/current — Phase 2 scaffold.

These tests use FastAPI's TestClient (backed by httpx) and do not
require a running server, live Plex, or live Jellyfin.

They verify the API contract when credentials are absent, which is
the expected state for a fresh checkout without a .env file.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealthStillWorks:
    """Regression: Phase 1 /health must remain intact after Phase 2 wiring."""

    def test_health_returns_ok(self) -> None:
        """GET /health should return status ok with confidence confirmed."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "cinema-machina-core"
        assert data["confidence"] == "confirmed"


class TestPlaybackCurrentUnconfigured:
    """Behaviour of /playback/current when no credentials are set."""

    def test_returns_200(self) -> None:
        """Endpoint must return HTTP 200 even when nothing is configured."""
        response = client.get("/playback/current")
        assert response.status_code == 200

    def test_sessions_is_empty_list(self) -> None:
        """With no credentials, sessions list must be empty."""
        response = client.get("/playback/current")
        data = response.json()
        assert data["sessions"] == []

    def test_sources_checked_is_empty(self) -> None:
        """With no credentials, no sources should be reported as checked."""
        response = client.get("/playback/current")
        data = response.json()
        assert data["sources_checked"] == []

    def test_error_is_none(self) -> None:
        """With no credentials (not an error), error field should be null."""
        response = client.get("/playback/current")
        data = response.json()
        assert data["error"] is None

    def test_response_shape(self) -> None:
        """Response must contain the three expected top-level keys."""
        response = client.get("/playback/current")
        data = response.json()
        assert "sessions" in data
        assert "sources_checked" in data
        assert "error" in data
