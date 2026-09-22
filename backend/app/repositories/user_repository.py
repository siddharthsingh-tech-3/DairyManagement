import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import PasswordResetToken, RefreshToken, User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Unscoped by tenant — only safe to call with an id that already came from
        a trusted source (a user's own signed JWT). Tenant-scoped lookups from
        admin-facing endpoints must use `get_by_id_in_tenant` instead, since
        `users` has no row-level security to fall back on (see the multi-tenant
        migration)."""
        return await self.db.get(User, user_id)

    async def get_by_id_in_tenant(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Deliberately unscoped by tenant — email is globally unique and login
        must find a user before any tenant is known."""
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self.db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def list_all(self, tenant_id: uuid.UUID) -> list[User]:
        result = await self.db.execute(
            select(User).where(User.tenant_id == tenant_id).order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    def add(self, user: User) -> None:
        self.db.add(user)

    async def save_refresh_token(self, token: RefreshToken) -> None:
        self.db.add(token)

    async def get_refresh_token(self, token_hash: str) -> RefreshToken | None:
        result = await self.db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.now(timezone.utc)

    async def revoke_all_refresh_tokens_for_user(self, user_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        )
        for token in result.scalars().all():
            token.revoked_at = datetime.now(timezone.utc)

    def save_password_reset_token(self, token: PasswordResetToken) -> None:
        self.db.add(token)

    async def get_password_reset_token(self, token_hash: str) -> PasswordResetToken | None:
        result = await self.db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()
