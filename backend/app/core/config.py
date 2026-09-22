from decimal import Decimal
from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    APP_NAME: str = "Kshirsagar Dairy Distribution Suite API"
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://dev:devpass@db:5432/milkdairy"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://dev:devpass@db:5432/milkdairy"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_ECHO: bool = False

    # --- Redis ---
    REDIS_URL: str = "redis://redis:6379/0"

    # --- Auth / JWT ---
    JWT_SECRET_KEY: str = "dev-only-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # --- CORS ---
    CORS_ORIGINS: list[AnyHttpUrl] | list[str] = ["http://localhost:5173"]

    # --- Rate limiting ---
    RATE_LIMIT_DEFAULT: str = "200/minute"
    RATE_LIMIT_LOGIN: str = "10/minute"

    # --- Business defaults (seed values; overridable via business_settings table) ---
    DEFAULT_CGST_PERCENT: Decimal = Decimal("2.5")
    DEFAULT_SGST_PERCENT: Decimal = Decimal("2.5")
    SAME_DAY_ORDER_CUTOFF_HOUR: int = 6
    NEXT_DAY_ORDER_CUTOFF_HOUR: int = 21
    SCHEDULED_ORDER_EDIT_CUTOFF_DAYS: int = 1

    # --- Storage (AWS) ---
    AWS_S3_BUCKET: str | None = None
    AWS_REGION: str = "ap-south-1"

    # --- Storage (local uploads) ---
    UPLOAD_DIR: str = "uploads"
    UPLOAD_MAX_BYTES: int = 5_000_000

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
