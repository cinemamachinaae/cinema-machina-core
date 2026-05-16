"""Application settings loaded from environment variables.

All credentials are optional at startup. Integrations that require
a missing credential must return an ``unknown`` playback state rather
than raising an exception.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for Cinema Machina Core.

    Values are read from the environment or a ``.env`` file in the
    project root. All integration credentials default to ``None`` so
    the backend can boot safely without any external services
    configured.

    Attributes:
        plex_url: Base URL of the local Plex Media Server,
            e.g. ``http://192.168.1.x:32400``.
        plex_token: Plex authentication token (X-Plex-Token).
        jellyfin_url: Base URL of the local Jellyfin server,
            e.g. ``http://192.168.1.x:8096``.
        jellyfin_api_key: Jellyfin API key generated in the dashboard.
        shield_ip: IPv4 address or hostname of the Nvidia Shield.
        shield_adb_port: TCP port used for ADB-over-network access.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Plex
    plex_url: str | None = None
    plex_token: str | None = None

    # Jellyfin
    jellyfin_url: str | None = None
    jellyfin_api_key: str | None = None

    # Nvidia Shield ADB
    shield_ip: str | None = None
    shield_adb_port: int = 5555


# Module-level singleton — import this everywhere rather than
# constructing a new Settings() in each module.
settings = Settings()
