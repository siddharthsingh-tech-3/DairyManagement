import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant


class TenantRepository:
    """`tenants` is the root table — not RLS-scoped (there's no wider tenant to
    scope it to), so these queries are deliberately unfiltered."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_all(self) -> list[Tenant]:
        result = await self.db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
        return list(result.scalars().all())

    async def get_by_id(self, tenant_id: uuid.UUID) -> Tenant | None:
        return await self.db.get(Tenant, tenant_id)

    async def get_by_slug(self, slug: str) -> Tenant | None:
        result = await self.db.execute(select(Tenant).where(Tenant.slug == slug))
        return result.scalar_one_or_none()

    def add(self, tenant: Tenant) -> None:
        self.db.add(tenant)
