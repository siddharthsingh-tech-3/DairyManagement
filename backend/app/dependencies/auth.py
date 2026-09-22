import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError
from app.core.security import TokenType, decode_token
from app.core.tenant_context import set_tenant_context
from app.dependencies.db import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise AuthenticationError("Invalid or expired access token") from exc

    if payload.get("type") != TokenType.ACCESS.value:
        raise AuthenticationError("Invalid token type")

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise AuthenticationError("Invalid token payload") from exc

    # `users` has no RLS (login must find a user by email before any tenant is
    # known — see the multi-tenant migration), so this by-id lookup is
    # unscoped. It's still safe: `user_id` only ever comes from this user's own
    # signed JWT, never from a caller-supplied value.
    user = await UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("User not found or inactive")

    tenant = await db.get(Tenant, user.tenant_id)
    if tenant is None or not tenant.is_active:
        raise AuthenticationError("This account's business is currently unavailable")

    # Scopes every tenant-scoped query for the rest of this request (RLS +
    # auto-stamping new rows) to this user's own tenant — trust the fresh DB
    # row, not whatever tenant_id claim the token happens to carry.
    await set_tenant_context(db, user.tenant_id)
    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    return user
