"""Plex session XML parser — Phase 2.1.

Parses the ``/status/sessions`` XML response from a Plex Media Server
into typed ``SessionState`` objects.

Plex returns XML in this shape::

    <MediaContainer size="1">
      <Video title="Dune: Part Two"
             type="movie"
             viewOffset="1234567"
             ...>
        <User title="rahul" />
        <Player product="Plex for Android (TV)"
                state="playing"
                ... />
        <Session id="..." />
        <Media videoCodec="hevc"
               audioCodec="truehd"
               container="mkv"
               videoResolution="4k"
               bitrate="80000"
               ...>
          <Part ...>
            <Stream streamType="1" codec="hevc" ... />
            <Stream streamType="2" codec="truehd" channels="8" ... />
          </Part>
        </Media>
        <TranscodeSession videoDecision="directPlay"
                          audioDecision="directPlay"
                          ... />
      </Video>
    </MediaContainer>

Rules:
- Fields sourced directly from Plex XML → ``confidence=confirmed``.
- Fields absent from the XML → remain ``None``; sub-models where **all**
  fields are absent get ``confidence=unknown``.
- Never infer AVR/soundbar state from Plex data.
- Never infer HDR format from Plex session XML (it is not reliably
  present — that requires FFprobe, Phase 4).

See SKILLS.md §12 for Plex-specific rules.
See AGENTS.md §3 for the confidence model.
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET

from app.models.playback import (
    AudioState,
    Confidence,
    PlaybackDecision,
    PlaybackSource,
    SessionState,
    VideoState,
)

logger = logging.getLogger(__name__)

# Plex player state values that indicate active playback.
_PLAYING_STATES: frozenset[str] = frozenset({"playing", "buffering"})

# Plex transcode decision → our PlaybackDecision mapping.
_DECISION_MAP: dict[str, PlaybackDecision] = {
    "directPlay": PlaybackDecision.DIRECT_PLAY,
    "directStream": PlaybackDecision.DIRECT_STREAM,
    "transcode": PlaybackDecision.TRANSCODE,
    "copy": PlaybackDecision.DIRECT_STREAM,  # Plex "copy" is a direct stream variant
}


def parse_sessions(xml_text: str) -> list[SessionState]:
    """Parse a Plex ``/status/sessions`` XML response into session objects.

    Args:
        xml_text: Raw XML string returned by the Plex session endpoint.

    Returns:
        A list of ``SessionState`` objects — one per active Video element.
        Returns an empty list if the XML is malformed or contains no sessions.
        Never raises.
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.error("Plex XML parse error: %s", exc)
        return []

    sessions: list[SessionState] = []

    # Plex wraps all active sessions in <Video> elements directly under
    # <MediaContainer>. Episodes appear as type="episode"; movies as
    # type="movie". We handle both the same way at this stage.
    for video in root.findall("Video"):
        try:
            session = _parse_video_element(video)
            sessions.append(session)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to parse Plex Video element: %s", exc)
            continue

    logger.debug("Parsed %d Plex session(s) from XML.", len(sessions))
    return sessions


def _parse_video_element(video: ET.Element) -> SessionState:
    """Parse a single ``<Video>`` element into a ``SessionState``.

    Args:
        video: An ``xml.etree.ElementTree.Element`` representing one
            Plex session.

    Returns:
        A fully-typed ``SessionState`` with ``confidence`` markers on
        all sub-models.
    """
    # --- Title ---
    title: str | None = video.get("title")

    # --- User ---
    user_el = video.find("User")
    user: str | None = user_el.get("title") if user_el is not None else None

    # --- Player / client ---
    player_el = video.find("Player")
    client_name: str | None = None
    player_state: str | None = None
    if player_el is not None:
        client_name = player_el.get("product") or player_el.get("title")
        player_state = player_el.get("state")

    is_playing = player_state in _PLAYING_STATES if player_state else False

    # --- Playback decision ---
    # TranscodeSession is only present when transcoding or direct-streaming.
    # If it is absent, Plex is direct-playing.
    decision = _parse_decision(video)

    # --- Media / stream attributes ---
    # We read from the <Media> element first (container-level), then refine
    # with individual <Stream> elements for codec detail.
    media_el = video.find("Media")
    video_state = _parse_video_state(media_el)
    audio_state = _parse_audio_state(media_el)

    # Overall session confidence: confirmed — this data came from Plex API.
    return SessionState(
        source=PlaybackSource.PLEX,
        is_playing=is_playing,
        title=title,
        user=user,
        client_name=client_name,
        decision=decision,
        video=video_state,
        audio=audio_state,
        confidence=Confidence.CONFIRMED,
    )


def _parse_decision(video: ET.Element) -> PlaybackDecision:
    """Derive the playback decision from a ``<Video>`` element.

    Plex exposes the decision in two places depending on version:
    1. ``<TranscodeSession videoDecision="..." />`` — present during
       transcoding or direct stream (copy).
    2. Absence of ``<TranscodeSession>`` → direct play.

    Args:
        video: The ``<Video>`` XML element.

    Returns:
        A ``PlaybackDecision`` enum value.
    """
    transcode_el = video.find("TranscodeSession")
    if transcode_el is None:
        # No transcode session = Plex is direct-playing.
        return PlaybackDecision.DIRECT_PLAY

    video_decision = transcode_el.get("videoDecision", "")
    return _DECISION_MAP.get(video_decision, PlaybackDecision.UNKNOWN)


def _parse_video_state(media_el: ET.Element | None) -> VideoState:
    """Extract video codec and resolution from a ``<Media>`` element.

    Prefers ``<Stream streamType="1">`` (video stream) data. Falls back
    to ``<Media>`` attributes if no stream element is present.

    HDR format is intentionally not parsed here — Plex session XML does
    not reliably expose it. HDR detection requires FFprobe (Phase 4).

    Args:
        media_el: The ``<Media>`` child of a ``<Video>`` element,
            or ``None`` if absent.

    Returns:
        A ``VideoState`` with ``confidence=confirmed`` if any video data
        was found, or ``confidence=unknown`` if nothing was available.
    """
    if media_el is None:
        return VideoState(confidence=Confidence.UNKNOWN)

    codec: str | None = None
    resolution: str | None = None
    bitrate_kbps: int | None = None

    # Try the dedicated video stream element first.
    for stream in media_el.iter("Stream"):
        if stream.get("streamType") == "1":  # 1 = video
            codec = stream.get("codec")
            break

    # Fall back to Media-level videoCodec attribute.
    if codec is None:
        codec = media_el.get("videoCodec")

    # Resolution: Plex reports "4k", "1080", "720" etc. on <Media>.
    resolution = media_el.get("videoResolution")

    # Bitrate in kbps on <Media>.
    raw_bitrate = media_el.get("bitrate")
    if raw_bitrate is not None:
        try:
            bitrate_kbps = int(raw_bitrate)
        except ValueError:
            logger.warning("Could not parse Plex bitrate value: %r", raw_bitrate)

    has_data = any(v is not None for v in (codec, resolution, bitrate_kbps))
    return VideoState(
        codec=codec,
        resolution=resolution,
        hdr_format=None,  # Never inferred from Plex session data
        bitrate_kbps=bitrate_kbps,
        confidence=Confidence.CONFIRMED if has_data else Confidence.UNKNOWN,
    )


def _parse_audio_state(media_el: ET.Element | None) -> AudioState:
    """Extract audio codec and channel count from a ``<Media>`` element.

    Prefers ``<Stream streamType="2">`` (audio stream) data.

    **Important (SKILLS.md §12 / AGENTS.md §9):** Audio codec reported
    here is what Plex carries in the session metadata — it describes the
    *source* audio format. It does NOT confirm AVR passthrough, Atmos
    decode, or soundbar final state. Those require downstream evidence.

    Args:
        media_el: The ``<Media>`` child of a ``<Video>`` element,
            or ``None`` if absent.

    Returns:
        An ``AudioState`` with ``confidence=confirmed`` if any audio data
        was found, or ``confidence=unknown`` if nothing was available.
    """
    if media_el is None:
        return AudioState(confidence=Confidence.UNKNOWN)

    codec: str | None = None
    channels: int | None = None

    # Try the dedicated audio stream element first.
    for stream in media_el.iter("Stream"):
        if stream.get("streamType") == "2":  # 2 = audio
            codec = stream.get("codec")
            raw_channels = stream.get("channels")
            if raw_channels is not None:
                try:
                    channels = int(raw_channels)
                except ValueError:
                    logger.warning(
                        "Could not parse Plex audio channels value: %r",
                        raw_channels,
                    )
            break

    # Fall back to Media-level audioCodec attribute.
    if codec is None:
        codec = media_el.get("audioCodec")

    has_data = any(v is not None for v in (codec, channels))
    return AudioState(
        codec=codec,
        channels=channels,
        confidence=Confidence.CONFIRMED if has_data else Confidence.UNKNOWN,
    )
