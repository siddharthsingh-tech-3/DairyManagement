from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.core.tenant_context import set_tenant_context
from app.models.enums import UserRole
from app.models.tenant import Tenant
from app.models.user import User
from app.models.vendor import Vendor

pytestmark = pytest.mark.asyncio


def _new_vendor(code: str) -> Vendor:
    return Vendor(
        code=code,
        name=f"Vendor {code}",
        contact_name="Contact",
        phone="9000000000",
        area="Area",
        route="Route 1",
        vendor_since=date.today() - timedelta(days=30),
    )


async def _login(client: AsyncClient, email: str, password: str = "Sup3rSecret!") -> dict:
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


async def test_vendor_from_other_tenant_returns_404(
    client: AsyncClient, db_session: AsyncSession, tenant: Tenant, other_tenant: Tenant
) -> None:
    # Admin for tenant A (the default active context).
    admin_a = User(
        email="admin-a@example.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Admin A",
        role=UserRole.SUPER_ADMIN,
    )
    db_session.add(admin_a)
    await db_session.commit()

    # A vendor that belongs to tenant B.
    await set_tenant_context(db_session, other_tenant.id)
    vendor_b = _new_vendor("V01")
    db_session.add(vendor_b)
    await db_session.commit()
    await db_session.refresh(vendor_b)

    # Logging in as A re-establishes A's tenant context server-side, regardless
    # of whatever this test last set it to.
    headers = await _login(client, "admin-a@example.com")

    resp = await client.get(f"/api/v1/vendors/{vendor_b.id}", headers=headers)
    assert resp.status_code == 404


async def test_same_vendor_code_allowed_across_tenants(
    db_session: AsyncSession, tenant: Tenant, other_tenant: Tenant
) -> None:
    db_session.add(_new_vendor("V01"))
    await db_session.flush()

    await set_tenant_context(db_session, other_tenant.id)
    db_session.add(_new_vendor("V01"))
    await db_session.flush()  # would raise IntegrityError if uniqueness were still global

    await db_session.commit()

    result = await db_session.execute(select(Vendor).where(Vendor.code == "V01"))
    assert len(result.scalars().all()) == 1  # RLS still scopes the read to tenant B


async def test_rls_blocks_reads_without_tenant_context(db_session: AsyncSession, tenant: Tenant) -> None:
    db_session.add(_new_vendor("V01"))
    await db_session.commit()

    await db_session.execute(text("RESET app.tenant_id"))
    result = await db_session.execute(select(Vendor))
    assert result.scalars().all() == []

    # Restore context so this session's own teardown queries aren't affected.
    await set_tenant_context(db_session, tenant.id)
