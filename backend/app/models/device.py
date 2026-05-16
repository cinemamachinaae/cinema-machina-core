"""Typed device models for the playback chain snapshot."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel

from app.models.playback import Confidence


class MediaServerKind(str, Enum):
    """Supported media server platforms."""

    PLEX = "plex"
    JELLYFIN = "jellyfin"
    KODI = "kodi"


class PlaybackClientKind(str, Enum):
    """Supported playback client platforms."""

    NVIDIA_SHIELD = "nvidia_shield"
    ZIDOO = "zidoo"
    DUNE = "dune"
    APPLE_TV = "apple_tv"
    FIRE_TV = "fire_tv"
    GOOGLE_TV = "google_tv"


class DisplayDeviceKind(str, Enum):
    """Supported display device classes."""

    TV = "tv"
    PROJECTOR = "projector"
    MONITOR = "monitor"


class AudioDeviceKind(str, Enum):
    """Supported audio device classes."""

    AVR = "avr"
    SOUNDBAR = "soundbar"
    PROCESSOR = "processor"


class MediaServerState(BaseModel):
    """Authoritative media server state for the current chain."""

    name: Optional[str] = None
    name_confidence: Confidence = Confidence.UNKNOWN
    kind: Optional[MediaServerKind] = None
    kind_confidence: Confidence = Confidence.UNKNOWN


class PlaybackClientState(BaseModel):
    """Current playback client state."""

    name: Optional[str] = None
    name_confidence: Confidence = Confidence.UNKNOWN
    kind: Optional[PlaybackClientKind] = None
    kind_confidence: Confidence = Confidence.UNKNOWN


class DisplayDeviceState(BaseModel):
    """Current display device state."""

    name: Optional[str] = None
    name_confidence: Confidence = Confidence.UNKNOWN
    kind: Optional[DisplayDeviceKind] = None
    kind_confidence: Confidence = Confidence.UNKNOWN


class AudioDeviceState(BaseModel):
    """Current downstream audio device state."""

    name: Optional[str] = None
    name_confidence: Confidence = Confidence.UNKNOWN
    kind: Optional[AudioDeviceKind] = None
    kind_confidence: Confidence = Confidence.UNKNOWN
