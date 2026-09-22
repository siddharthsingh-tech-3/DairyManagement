from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, NotFoundError
from app.core.security import (
    create_access_token,
    generate_password_reset_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.core.tenant_context import set_tenant_context
from app.models.tenant import Tenant
from app.models.user import PasswordResetToken, RefreshToken, User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.audit = AuditService(db)
        self.notifications = NotificationService()

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.users.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
        if not user.is_active:
            raise AuthenticationError("This account has been deactivated")
        await self._require_active_tenant(user)
        return user

    async def _require_active_tenant(self, user: User) -> None:
        tenant = await self.db.get(Tenant, user.tenant_id)
        if tenant is None or not tenant.is_active:
            raise AuthenticationError("This account's business is currently unavailable")

    async def issue_tokens(self, user: User) -> TokenResponse:
        access_token = create_access_token(
            subject=str(user.id), role=user.role.value, extra_claims={"tenant_id": str(user.tenant_id)}
        )
        raw_refresh, refresh_hash, expires_at = generate_refresh_token()
        await self.users.save_refresh_token(
            RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=expires_at, created_at=datetime.now(timezone.utc))
        )
        return TokenResponse(access_token=access_token, refresh_token=raw_refresh)

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self.authenticate(email, password)
        await set_tenant_context(self.db, user.tenant_id)
        user.last_login_at = datetime.now(timezone.utc)
        tokens = await self.issue_tokens(user)
        self.audit.log(user.full_name, "logged in", user_id=user.id, entity_type="user", entity_id=user.id)
        await self.db.commit()
        return tokens

    async def refresh(self, raw_refresh_token: str) -> TokenResponse:
        token_hash = hash_refresh_token(raw_refresh_token)
        token = await self.users.get_refresh_token(token_hash)
        if token is None or token.revoked_at is not None or token.expires_at < datetime.now(timezone.utc):
            raise AuthenticationError("Invalid or expired refresh token")
        user = await self.users.get_by_id(token.user_id)
        if user is None or not user.is_active:
            raise AuthenticationError("Account is unavailable")
        await self._require_active_tenant(user)
        await self.users.revoke_refresh_token(token)
        tokens = await self.issue_tokens(user)
        await self.db.commit()
        return tokens

    async def logout(self, raw_refresh_token: str) -> None:
        token_hash = hash_refresh_token(raw_refresh_token)
        token = await self.users.get_refresh_token(token_hash)
        if token is not None and token.revoked_at is None:
            await self.users.revoke_refresh_token(token)
            await self.db.commit()

    async def forgot_password(self, email: str) -> None:
        user = await self.users.get_by_email(email)
        if user is None:
            return
        raw_token, token_hash, expires_at = generate_password_reset_token()
        self.users.save_password_reset_token(
            PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
                created_at=datetime.now(timezone.utc),
            )
        )
        await self.db.commit()
        await self.notifications.send_password_reset(user.email, raw_token)

    async def reset_password(self, raw_token: str, new_password: str) -> None:
        token_hash = hash_refresh_token(raw_token)
        reset_token = await self.users.get_password_reset_token(token_hash)
        if (
            reset_token is None
            or reset_token.used_at is not None
            or reset_token.expires_at < datetime.now(timezone.utc)
        ):
            raise AuthenticationError("Invalid or expired reset token")
        user = await self.users.get_by_id(reset_token.user_id)
        if user is None:
            raise NotFoundError("User not found")
        await set_tenant_context(self.db, user.tenant_id)
        user.password_hash = hash_password(new_password)
        reset_token.used_at = datetime.now(timezone.utc)
        await self.users.revoke_all_refresh_tokens_for_user(user.id)
        self.audit.log(user.full_name, "reset password", user_id=user.id, entity_type="user", entity_id=user.id)
        await self.db.commit()

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user.password_hash):
            raise AuthenticationError("Current password is incorrect")
        user.password_hash = hash_password(new_password)
        await self.users.revoke_all_refresh_tokens_for_user(user.id)
        self.audit.log(user.full_name, "changed password", user_id=user.id, entity_type="user", entity_id=user.id)
        await self.db.commit()
