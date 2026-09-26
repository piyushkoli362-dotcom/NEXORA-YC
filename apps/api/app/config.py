from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:///./nexora.db"
    frontend_url: str = "http://localhost:3000"
    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    redis_url: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@example.com"
    llm_api_key: str = ""

    @model_validator(mode="after")
    def production_requirements(self):
        if self.app_env == "production":
            if not self.database_url.startswith("postgresql"):
                raise ValueError("Production requires PostgreSQL")
            if not self.redis_url or not self.smtp_host:
                raise ValueError("Production requires Redis and SMTP")
            if not self.frontend_url.startswith("https://") or any(
                not x.startswith("https://") for x in self.allowed_origins
            ):
                raise ValueError("Production requires explicit HTTPS origins")
        return self


@lru_cache
def settings():
    return Settings()
