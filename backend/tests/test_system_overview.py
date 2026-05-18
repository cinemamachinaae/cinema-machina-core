"""Tests for the aggregated system overview endpoint."""

from __future__ import annotations

from unittest.mock import PropertyMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.chain import ChainSnapshotResponse
from app.models.device import ShieldDeviceState
from app.models.playback import Confidence, PlaybackCurrentResponse
from app.models.system import HealthStatusResponse, IntegrationStatusState

client = TestClient(app)


class TestSystemOverview:
    """System overview route behaviour."""

    def test_returns_200_and_expected_shape(self) -> None:
        with (
            patch(
                "app.services.system_overview.get_plex_status",
                return_value=IntegrationStatusState(),
            ),
            patch(
                "app.services.system_overview.get_jellyfin_status",
                return_value=IntegrationStatusState(),
            ),
        ):
            response = client.get("/system/overview")

        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        assert "health" in data
        assert "playback" in data
        assert "chain" in data
        assert "shield" in data
        assert "configured_sources" in data
        assert "integrations" in data
        assert "warnings" in data

    def test_unconfigured_overview_stays_safe(self) -> None:
        with (
            patch(
                "app.services.system_overview.ShieldAdbMonitor.is_configured",
                new_callable=PropertyMock,
                return_value=False,
            ),
            patch(
                "app.services.system_overview.ShieldAdbMonitor.get_state",
                return_value=ShieldDeviceState(configured=False),
            ),
            patch(
                "app.services.system_overview.get_plex_status",
                return_value=IntegrationStatusState(),
            ),
            patch(
                "app.services.system_overview.get_jellyfin_status",
                return_value=IntegrationStatusState(),
            ),
        ):
            response = client.get("/system/overview")
            data = response.json()

        assert data["chain"]["active"] is False
        assert data["chain"]["confidence"] == "unknown"
        assert data["shield"]["configured"] is False

    def test_warnings_are_aggregated_from_children(self) -> None:
        with (
            patch(
                "app.services.system_overview.get_health_status",
                return_value=HealthStatusResponse(),
            ),
            patch(
                "app.services.system_overview.get_current_playback_snapshot",
                return_value=PlaybackCurrentResponse(error="plex: timed out"),
            ),
            patch(
                "app.services.system_overview.get_current_chain_snapshot",
                return_value=ChainSnapshotResponse(warnings=["Display device state is currently unknown."]),
            ),
            patch(
                "app.services.system_overview.ShieldAdbMonitor.get_state",
                return_value=ShieldDeviceState(
                    configured=True,
                    confidence=Confidence.INFERRED,
                    warnings=["Shield is unreachable over ADB."],
                ),
            ),
            patch(
                "app.services.system_overview.get_plex_status",
                return_value=IntegrationStatusState(),
            ),
            patch(
                "app.services.system_overview.get_jellyfin_status",
                return_value=IntegrationStatusState(),
            ),
        ):
            response = client.get("/system/overview")

        assert response.status_code == 200
        assert response.json()["warnings"] == [
            "Display device state is currently unknown.",
            "Shield is unreachable over ADB.",
            "plex: timed out",
        ]
