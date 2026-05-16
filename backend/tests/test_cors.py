"""CORS regression tests for the local dashboard integration."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestLocalDashboardCors:
    """Local Next.js origins can read backend API responses in the browser."""

    def test_health_preflight_allows_localhost_dashboard(self) -> None:
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == (
            "http://localhost:3000"
        )
        assert "GET" in response.headers["access-control-allow-methods"]

    def test_playback_response_allows_127_dashboard(self) -> None:
        response = client.get(
            "/playback/current",
            headers={"Origin": "http://127.0.0.1:3000"},
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == (
            "http://127.0.0.1:3000"
        )
