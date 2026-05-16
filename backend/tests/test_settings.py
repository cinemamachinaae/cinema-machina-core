"""Tests for repository-root settings loading."""

from __future__ import annotations

from pathlib import Path

from app.config.settings import Settings, get_default_env_file, get_repo_root


class TestSettingsLoading:
    """Settings should load from repo root, not current working directory."""

    def test_default_env_file_points_to_repo_root(self) -> None:
        repo_root = get_repo_root()
        assert get_default_env_file() == repo_root / ".env"

    def test_settings_can_load_shield_values_from_env_file(self, tmp_path: Path) -> None:
        env_file = tmp_path / ".env"
        env_file.write_text(
            "SHIELD_IP=192.168.1.143\nSHIELD_ADB_PORT=5555\n",
            encoding="utf-8",
        )

        settings = Settings(_env_file=env_file)

        assert settings.shield_ip == "192.168.1.143"
        assert settings.shield_adb_port == 5555

    def test_environment_variables_override_env_file(self, tmp_path: Path, monkeypatch) -> None:
        env_file = tmp_path / ".env"
        env_file.write_text(
            "SHIELD_IP=10.0.0.50\nSHIELD_ADB_PORT=5555\n",
            encoding="utf-8",
        )

        monkeypatch.setenv("SHIELD_IP", "192.168.1.143")
        monkeypatch.setenv("SHIELD_ADB_PORT", "5560")

        settings = Settings(_env_file=env_file)

        assert settings.shield_ip == "192.168.1.143"
        assert settings.shield_adb_port == 5560
