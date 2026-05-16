"""System-wide monitoring overview service."""

from __future__ import annotations

from datetime import datetime, timezone

from app.devices.android_adb.shield import ShieldAdbMonitor
from app.integrations.jellyfin.client import JellyfinClient
from app.integrations.plex.client import PlexClient
from app.models.playback import Confidence
from app.models.system import (
    ConfiguredSourceState,
    ConfiguredSourcesState,
    HealthStatusResponse,
    SystemOverviewResponse,
)
from app.services.chain_snapshot import get_current_chain_snapshot
from app.services.playback_snapshot import get_current_playback_snapshot

_plex = PlexClient()
_jellyfin = JellyfinClient()


def get_health_status() -> HealthStatusResponse:
    """Return the backend health status."""
    return HealthStatusResponse(
        status="ok",
        service="cinema-machina-core",
        confidence=Confidence.CONFIRMED,
    )


def get_system_overview() -> SystemOverviewResponse:
    """Aggregate backend, playback chain, and device monitoring state."""
    health = get_health_status()
    playback = get_current_playback_snapshot()
    chain = get_current_chain_snapshot()
    shield = ShieldAdbMonitor().get_state()

    warnings = _merge_warnings(
        chain.warnings,
        shield.warnings,
        [playback.error] if playback.error else [],
    )

    return SystemOverviewResponse(
        timestamp=datetime.now(timezone.utc),
        health=health,
        playback=playback,
        chain=chain,
        shield=shield,
        configured_sources=ConfiguredSourcesState(
            plex=ConfiguredSourceState(configured=_plex.is_configured),
            jellyfin=ConfiguredSourceState(configured=_jellyfin.is_configured),
            shield=ConfiguredSourceState(configured=ShieldAdbMonitor().is_configured),
        ),
        warnings=warnings,
    )


def _merge_warnings(*warning_groups: list[str]) -> list[str]:
    """Merge warnings while preserving order and removing duplicates."""
    merged: list[str] = []
    seen: set[str] = set()

    for group in warning_groups:
        for warning in group:
            if not warning or warning in seen:
                continue
            seen.add(warning)
            merged.append(warning)

    return merged
