"""Playback state Pydantic models.

Every field that describes a playback attribute carries a
``confidence`` marker: ``confirmed``, ``inferred``, or ``unknown``.
This is a core Cinema Machina principle — we never guess quality.

See SKILLS.md §2 and AGENTS.md §3.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Confidence(str, Enum):
    """Confidence level for a playback attribute.

    confirmed: Value was reported directly by an authoritative source
               (e.g. Plex session API, Jellyfin session API).
    inferred:  Value was derived from secondary evidence
               (e.g. ADB dumpsys, file metadata).
    unknown:   Value could not be determined (credentials missing,
               service unreachable, or no active session).
    """

    CONFIRMED = "confirmed"
    INFERRED = "inferred"
    UNKNOWN = "unknown"


class PlaybackSource(str, Enum):
    """Which media server reported this session."""

    PLEX = "plex"
    JELLYFIN = "jellyfin"
    NONE = "none"


class VideoState(BaseModel):
    """Video stream attributes for the current session.

    Attributes:
        codec: Video codec identifier, e.g. ``HEVC``, ``AVC``.
        resolution: Resolution string, e.g. ``3840x2160``.
        hdr_format: HDR format if present, e.g. ``Dolby Vision``,
            ``HDR10``.
        bitrate_kbps: Stream bitrate in kilobits per second.
        confidence: How certain we are about this data.
    """

    codec: Optional[str] = None
    container: Optional[str] = None
    resolution: Optional[str] = None
    hdr_format: Optional[str] = None
    bitrate_kbps: Optional[int] = None
    confidence: Confidence = Confidence.UNKNOWN


class AudioState(BaseModel):
    """Audio stream attributes for the current session.

    Attributes:
        codec: Audio codec identifier, e.g. ``TrueHD Atmos``,
            ``DTS-X``, ``AAC``.
        channels: Channel count, e.g. 8 for 7.1.
        confidence: How certain we are about this data.
    """

    codec: Optional[str] = None
    channels: Optional[int] = None
    confidence: Confidence = Confidence.UNKNOWN


class PlaybackDecision(str, Enum):
    """How the media server is delivering the stream to the client."""

    DIRECT_PLAY = "direct_play"
    DIRECT_STREAM = "direct_stream"
    TRANSCODE = "transcode"
    UNKNOWN = "unknown"


class SessionState(BaseModel):
    """Full playback session state snapshot.

    Attributes:
        source: Which media server provided this session.
        is_playing: Whether any active session was detected.
        title: Title of the currently playing item.
        user: Plex/Jellyfin username for this session.
        client_name: Name of the playback client device.
        decision: How the media server is delivering the stream.
        video: Video stream state.
        audio: Audio stream state.
        confidence: Overall confidence in this session snapshot.
    """

    source: PlaybackSource = PlaybackSource.NONE
    is_playing: bool = False
    title: Optional[str] = None
    user: Optional[str] = None
    client_name: Optional[str] = None
    decision: PlaybackDecision = PlaybackDecision.UNKNOWN
    video: VideoState = Field(default_factory=VideoState)
    audio: AudioState = Field(default_factory=AudioState)
    confidence: Confidence = Confidence.UNKNOWN


class PlaybackCurrentResponse(BaseModel):
    """Response envelope for ``GET /playback/current``.

    Attributes:
        sessions: List of active playback sessions detected across all
            configured media servers.
        sources_checked: Which integrations were queried.
        error: Human-readable error message if a source failed,
            otherwise ``None``.
    """

    sessions: list[SessionState] = Field(default_factory=list)
    sources_checked: list[PlaybackSource] = Field(default_factory=list)
    error: Optional[str] = None
