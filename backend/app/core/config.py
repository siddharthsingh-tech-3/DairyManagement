from decimal import Decimal
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


def _with_postgres_driver(url: str, driver: str) -> str:
    parsed = make_url(url)
    if parsed.drivername not in {"postgres", "postgresql"} and not parsed.drivername.startswith(
        "postgresql+"
    ):
        return url

    query = dict(parsed.query)
    if driver == "asyncpg":
        # asyncpg uses `ssl` rather than libpq's `sslmode` and does not accept
        # the libpq-only `channel_binding` option included in Neon URLs.
        query.pop("channel_binding", None)
        if "sslmode" in query:
            query["ssl"] = query.pop("sslmode")

    return parsed.set(drivername=f"postgresql+{driver}", query=query).render_as_string(
        hide_password=False
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env.local"), env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    APP_NAME: str = "Kshirsagar Dairy Distribution Suite API"
    ENVIRONMENT: Literal["development", "staging", "production", "test"] = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://dev:devpass@db:5432/milkdairy"
    DATABASE_URL_UNPOOLED: str | None = None
    DATABASE_URL_SYNC: str | None = None
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

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def use_asyncpg_driver(cls, value: str) -> str:
        return _with_postgres_driver(value, "asyncpg")

    @field_validator("DATABASE_URL_SYNC", mode="before")
    @classmethod
    def use_psycopg_driver(cls, value: str | None) -> str | None:
        return _with_postgres_driver(value, "psycopg2") if value else value

    @model_validator(mode="after")
    def configure_neon_database_urls(self) -> "Settings":
        # The tenant RLS context is session-scoped, so the runtime must use
        # Neon's direct endpoint rather than a transaction-pooler endpoint.
        # Prefer the explicit unpooled URL supplied by `neon env pull`.
        if self.DATABASE_URL_UNPOOLED:
            self.DATABASE_URL = _with_postgres_driver(self.DATABASE_URL_UNPOOLED, "asyncpg")
            # `DATABASE_URL_SYNC` may be left over in backend/.env from local
            # Compose; always derive Neon migrations from its direct URL.
            self.DATABASE_URL_SYNC = _with_postgres_driver(self.DATABASE_URL_UNPOOLED, "psycopg2")
        elif not self.DATABASE_URL_SYNC:
            self.DATABASE_URL_SYNC = _with_postgres_driver(self.DATABASE_URL, "psycopg2")

        host = urlsplit(self.DATABASE_URL).hostname
        if host and "-pooler" in host:
            raise ValueError(
                "DATABASE_URL must use Neon's direct (unpooled) endpoint because tenant RLS "
                "context is session-scoped; set DATABASE_URL_UNPOOLED or use the direct URL."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
