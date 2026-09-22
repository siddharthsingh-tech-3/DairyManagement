"""Pytest fixtures.

These tests run against a real Postgres instance (the `db` service from
docker-compose) since the models use Postgres-native UUID/ENUM types. Set
DATABASE_URL_SYNC / DATABASE_URL to point at a disposable test database before
running `pytest` (see backend/README section on testing).
"""

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.tenant_context import set_tenant_context
from app.db.base import Base
from app.db.tenant_scope import enable_row_level_security
from app.dependencies.db import get_db
from app.main import app
from app.models.tenant import Tenant


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_engine():
    from app.core.config import settings

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await enable_row_level_security(conn)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    session_maker = async_sessionmaker(bind=db_engine, expire_on_commit=False)
    async with session_maker() as session:
        # Every existing test creates users/vendors/etc. directly via the ORM
        # without knowing about tenants at all — auto-establishing a default
        # tenant context here means `tenant_id` gets stamped on those objects
        # for free (see app.db.tenant_scope) and none of those tests need to
        # change. Tests that specifically exercise multi-tenant isolation ask
        # for the `tenant` / `other_tenant` fixtures below instead.
        default_tenant = Tenant(name="Test Tenant", slug="test-tenant")
        session.add(default_tenant)
        await session.flush()
        await set_tenant_context(session, default_tenant.id)
        yield session


@pytest_asyncio.fixture
async def tenant(db_session: AsyncSession) -> Tenant:
    """The default tenant `db_session` is already scoped to."""
    result = await db_session.execute(select(Tenant).where(Tenant.slug == "test-tenant"))
    return result.scalar_one()


@pytest_asyncio.fixture
async def other_tenant(db_session: AsyncSession, tenant: Tenant) -> Tenant:
    """A second tenant for cross-tenant isolation tests. `db_session` stays
    scoped to `tenant` by default; a test switches to this one explicitly with
    `await set_tenant_context(db_session, other_tenant.id)` once it's ready to
    create/query data as the other tenant."""
    t = Tenant(name="Other Tenant", slug="other-tenant")
    db_session.add(t)
    await db_session.flush()
    return t


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
