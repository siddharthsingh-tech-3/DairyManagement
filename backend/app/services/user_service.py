import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreateRequest, UserSetPasswordRequest, UserUpdateRequest
from app.services.audit_service import AuditService


class UserService:
    """`users` has no row-level security (see the multi-tenant migration), so
    unlike every other service, this one must filter by `tenant_id` itself."""

    def __init__(self, db: AsyncSession, tenant_id: uuid.UUID) -> None:
        self.db = db
        self.tenant_id = tenant_id
        self.users = UserRepository(db)
        self.audit = AuditService(db)

    async def list_users(self) -> list[User]:
        return await self.users.list_all(self.tenant_id)

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self.users.get_by_id_in_tenant(user_id, self.tenant_id)
        if user is None:
            raise NotFoundError("User not found")
        return user

    async def create_user(self, data: UserCreateRequest, actor_name: str) -> User:
        if await self.users.get_by_email(data.email) is not None:
            raise ConflictError("A user with this email already exists")
        if data.role == UserRole.VENDOR and data.vendor_id is None:
            raise ValidationAppError("vendor_id is required for a vendor user")
        if data.role == UserRole.DRIVER and data.driver_id is None:
            raise ValidationAppError("driver_id is required for a driver user")

        user = User(
            email=data.email.lower(),
            phone=data.phone,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
            vendor_id=data.vendor_id if data.role == UserRole.VENDOR else None,
            driver_id=data.driver_id if data.role == UserRole.DRIVER else None,
        )
        self.users.add(user)
        self.audit.log(actor_name, f"created user {data.full_name} ({data.role.value})")
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user(self, user_id: uuid.UUID, data: UserUpdateRequest, actor_name: str) -> User:
        user = await self.get_user(user_id)
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.phone is not None:
            user.phone = data.phone
        if data.is_active is not None:
            user.is_active = data.is_active
        self.audit.log(actor_name, f"updated user {user.full_name}", entity_type="user", entity_id=user.id)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def set_password(self, user_id: uuid.UUID, data: UserSetPasswordRequest, actor_name: str) -> User:
        """Admin-initiated password reset — the recovery path for a user who
        forgot theirs, since the self-service forgot-password email isn't
        wired to a real provider yet (see NotificationService). Revokes their
        existing sessions so the old password can't keep a refresh token alive."""
        user = await self.get_user(user_id)
        user.password_hash = hash_password(data.new_password)
        await self.users.revoke_all_refresh_tokens_for_user(user.id)
        self.audit.log(
            actor_name, f"reset password for {user.full_name}", entity_type="user", entity_id=user.id
        )
        await self.db.commit()
        await self.db.refresh(user)
        return user
