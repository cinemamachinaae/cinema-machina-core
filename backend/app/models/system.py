"""Typed models for system-wide monitoring overview responses."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.chain import ChainSnapshotResponse
from app.models.device import ShieldDeviceState
from app.models.playback import Confidence, PlaybackCurrentResponse


class HealthStatusResponse(BaseModel):
    """Health status payload for the backend service."""

    status: str = "ok"
    service: str = "cinema-machina-core"
    confidence: Confidence = Confidence.CONFIRMED


class ConfiguredSourceState(BaseModel):
    """Whether a given integration is configured locally."""

    configured: bool = False
    confidence: Confidence = Confidence.CONFIRMED


class ConfiguredSourcesState(BaseModel):
    """Configured/unconfigured integration summary."""

    plex: ConfiguredSourceState = Field(default_factory=ConfiguredSourceState)
    jellyfin: ConfiguredSourceState = Field(default_factory=ConfiguredSourceState)
    shield: ConfiguredSourceState = Field(default_factory=ConfiguredSourceState)


class SystemOverviewResponse(BaseModel):
    """Aggregated monitoring overview for the production dashboard."""

    timestamp: datetime
    health: HealthStatusResponse = Field(default_factory=HealthStatusResponse)
    playback: PlaybackCurrentResponse = Field(default_factory=PlaybackCurrentResponse)
    chain: ChainSnapshotResponse = Field(default_factory=ChainSnapshotResponse)
    shield: ShieldDeviceState = Field(default_factory=ShieldDeviceState)
    configured_sources: ConfiguredSourcesState = Field(default_factory=ConfiguredSourcesState)
    warnings: list[str] = Field(default_factory=list)
