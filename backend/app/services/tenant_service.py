import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.core.tenant_context import set_tenant_context
from app.models.enums import UserRole
from app.models.tenant import Tenant
from app.models.user import User
from app.repositories.tenant_repository import TenantRepository
from app.repositories.user_repository import UserRepository
from app.services.audit_service import AuditService


class TenantService:
    """Cross-tenant platform operations — list/create/suspend tenants. Only
    reachable via `require_platform_admin`; ordinary tenant admins never see
    this. See app/dependencies/permissions.py."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.tenants = TenantRepository(db)
        self.users = UserRepository(db)
        self.audit = AuditService(db)

    async def list_tenants(self) -> list[Tenant]:
        return await self.tenants.list_all()

    async def create_tenant(
        self,
        name: str,
        slug: str,
        admin_email: str,
        admin_name: str,
        admin_password: str,
        actor_name: str,
    ) -> Tenant:
        if await self.tenants.get_by_slug(slug) is not None:
            raise ConflictError(f"A tenant with slug '{slug}' already exists")
        if await self.users.get_by_email(admin_email) is not None:
            raise ConflictError("A user with this email already exists")

        tenant = Tenant(name=name, slug=slug)
        self.tenants.add(tenant)
        await self.db.flush()

        # The new tenant's admin belongs to *their* tenant, not the platform
        # admin's — switch context so the row (and this tenant's own audit
        # trail) is stamped correctly, not the acting platform admin's tenant.
        await set_tenant_context(self.db, tenant.id)
        admin = User(
            tenant_id=tenant.id,
            email=admin_email.lower(),
            password_hash=hash_password(admin_password),
            full_name=admin_name,
            role=UserRole.SUPER_ADMIN,
        )
        self.users.add(admin)
        self.audit.log(actor_name, f"Tenant '{name}' provisioned", entity_type="tenant", entity_id=tenant.id)
        await self.db.commit()
        await self.db.refresh(tenant)
        return tenant

    async def set_active(self, tenant_id: uuid.UUID, is_active: bool, actor_name: str) -> Tenant:
        tenant = await self.tenants.get_by_id(tenant_id)
        if tenant is None:
            raise NotFoundError("Tenant not found")
        tenant.is_active = is_active
        await set_tenant_context(self.db, tenant.id)
        self.audit.log(
            actor_name,
            f"Tenant {'activated' if is_active else 'deactivated'}",
            entity_type="tenant",
            entity_id=tenant.id,
        )
        await self.db.commit()
        await self.db.refresh(tenant)
        return tenant
