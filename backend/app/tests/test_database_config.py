import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_neon_unpooled_url_configures_runtime_and_migrations() -> None:
    settings = Settings(
        _env_file=None,
        DATABASE_URL="postgresql://app:secret@ep-example-pooler.us-east-2.aws.neon.tech/neondb",
        DATABASE_URL_UNPOOLED="postgresql://app:secret@ep-example.us-east-2.aws.neon.tech/neondb",
    )

    assert settings.DATABASE_URL == (
        "postgresql+asyncpg://app:secret@ep-example.us-east-2.aws.neon.tech/neondb"
    )
    assert settings.DATABASE_URL_SYNC == (
        "postgresql+psycopg2://app:secret@ep-example.us-east-2.aws.neon.tech/neondb"
    )


def test_plain_postgres_url_configures_both_drivers() -> None:
    settings = Settings(_env_file=None, DATABASE_URL="postgres://app:secret@localhost/neondb")

    assert settings.DATABASE_URL == "postgresql+asyncpg://app:secret@localhost/neondb"
    assert settings.DATABASE_URL_SYNC == "postgresql+psycopg2://app:secret@localhost/neondb"


def test_pooled_runtime_url_without_direct_url_is_rejected() -> None:
    with pytest.raises(ValidationError, match=r"direct \(unpooled\) endpoint"):
        Settings(
            _env_file=None,
            DATABASE_URL="postgresql://app:secret@ep-example-pooler.us-east-2.aws.neon.tech/neondb",
        )