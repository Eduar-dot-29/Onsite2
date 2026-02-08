from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "on-site-on-transit"
    environment: str = "local"

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/tracking"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24

    telegram_bot_token: str | None = None
    telegram_webhook_secret: str | None = None
    telegram_webhook_url: str | None = None
    # Comma-separated Telegram chat ids to receive admin alerts (e.g. "123,456")
    telegram_admin_chat_ids: str | None = None

    # Worker automation (v2)
    silence_tolerance_minutes: int = 30
    average_speed_kmh: int = 80

    routing_provider: str = "stub"
    routing_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
