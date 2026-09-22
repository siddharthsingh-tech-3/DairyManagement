"""Provision a tenant (distributor business) and its first admin user, or
bootstrap a platform admin.

Ordinary tenant onboarding now happens in-app (POST /api/v1/tenants, gated by
`require_platform_admin`) — but granting that very first `is_platform_admin`
flag is a chicken-and-egg problem no in-app flow can solve, so this script
remains the way to bootstrap it:

    python -m scripts.create_tenant \\
        --name "Acme Dairy" --slug acme \\
        --admin-email admin@acmedairy.com --admin-name "Acme Admin" \\
        --admin-password ChangeMe123! [--platform-admin]

Idempotent on slug (reuses the existing tenant) and on email: if the admin
user already exists, --platform-admin promotes it in place instead of erroring.
"""
import argparse
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.core.tenant_context import set_tenant_context
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.tenant import Tenant
from app.models.user import User


async def get_or_create_tenant(db: AsyncSession, name: str, slug: str) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        tenant = Tenant(name=name, slug=slug)
        db.add(tenant)
        await db.flush()
    return tenant


async def create_tenant(
    name: str,
    slug: str,
    admin_email: str,
    admin_name: str,
    admin_password: str,
    platform_admin: bool = False,
) -> None:
    async with AsyncSessionLocal() as db:
        tenant = await get_or_create_tenant(db, name, slug)
        await set_tenant_context(db, tenant.id)

        existing = await db.execute(select(User).where(User.email == admin_email.lower()))
        user = existing.scalar_one_or_none()
        if user is not None:
            print(f"User {admin_email} already exists.")
            if platform_admin and not user.is_platform_admin:
                user.is_platform_admin = True
                print(f"Promoted {admin_email} to platform admin.")
        else:
            db.add(
                User(
                    tenant_id=tenant.id,
                    email=admin_email.lower(),
                    password_hash=hash_password(admin_password),
                    full_name=admin_name,
                    role=UserRole.SUPER_ADMIN,
                    is_platform_admin=platform_admin,
                )
            )
        await db.commit()
        print(f"Tenant '{tenant.name}' (slug={tenant.slug}, id={tenant.id}) ready.")
        print(f"Admin login: {admin_email}" + (" (platform admin)" if platform_admin else ""))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", required=True, help="Tenant display name, e.g. 'Acme Dairy'")
    parser.add_argument("--slug", required=True, help="Unique tenant slug, e.g. 'acme'")
    parser.add_argument("--admin-email", required=True)
    parser.add_argument("--admin-name", required=True)
    parser.add_argument("--admin-password", required=True)
    parser.add_argument(
        "--platform-admin",
        action="store_true",
        help="Grant this admin cross-tenant platform access (list/create/suspend tenants in-app).",
    )
    args = parser.parse_args()
    asyncio.run(
        create_tenant(
            args.name, args.slug, args.admin_email, args.admin_name, args.admin_password, args.platform_admin
        )
    )


if __name__ == "__main__":
    main()
