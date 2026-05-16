"""Playback chain snapshot models for the production dashboard foundation."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from app.models.device import (
    AudioDeviceState,
    DisplayDeviceState,
    MediaServerState,
    PlaybackClientState,
)
from app.models.playback import Confidence


class SourceMediaState(BaseModel):
    """Source media properties reported by upstream playback metadata."""

    codec: Optional[str] = None
    codec_confidence: Confidence = Confidence.UNKNOWN
    container: Optional[str] = None
    container_confidence: Confidence = Confidence.UNKNOWN
    bitrate_kbps: Optional[int] = None
    bitrate_confidence: Confidence = Confidence.UNKNOWN
    hdr_format: Optional[str] = None
    hdr_confidence: Confidence = Confidence.UNKNOWN
    audio_codec: Optional[str] = None
    audio_codec_confidence: Confidence = Confidence.UNKNOWN


class OutputState(BaseModel):
    """Downstream output state of the active chain."""

    video_mode: Optional[str] = None
    video_mode_confidence: Confidence = Confidence.UNKNOWN
    audio_mode: Optional[str] = None
    audio_mode_confidence: Confidence = Confidence.UNKNOWN
    passthrough: Optional[bool] = None
    passthrough_confidence: Confidence = Confidence.UNKNOWN


class ChainSnapshotResponse(BaseModel):
    """Unified playback chain snapshot for the dashboard."""

    active: bool = False
    confidence: Confidence = Confidence.UNKNOWN
    source: Optional[SourceMediaState] = None
    media_server: Optional[MediaServerState] = None
    playback_client: Optional[PlaybackClientState] = None
    display_device: Optional[DisplayDeviceState] = None
    audio_device: Optional[AudioDeviceState] = None
    output_state: Optional[OutputState] = None
    warnings: list[str] = Field(default_factory=list)
