from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PermissionDeniedError
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.models.enums import PermissionFeature, PermissionLevel, UserRole
from app.models.user import User
from app.services.permission_service import PermissionService

_LEVEL_RANK = {PermissionLevel.NONE: 0, PermissionLevel.VIEW: 1, PermissionLevel.FULL: 2}


def require_permission(
    feature: PermissionFeature, min_level: PermissionLevel = PermissionLevel.VIEW
) -> Callable[..., Coroutine[Any, Any, User]]:
    async def dependency(
        user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if user.role == UserRole.SUPER_ADMIN:
            return user
        level = await PermissionService(db).get_level(feature, user.role)
        if _LEVEL_RANK[level] < _LEVEL_RANK[min_level]:
            raise PermissionDeniedError(f"You do not have access to {feature.value}")
        return user

    return dependency


def require_role(*roles: UserRole) -> Callable[..., Coroutine[Any, Any, User]]:
    async def dependency(user: User = Depends(get_current_active_user)) -> User:
        if user.role not in roles:
            raise PermissionDeniedError("You do not have permission to perform this action")
        return user

    return dependency


require_admin = require_role(UserRole.SUPER_ADMIN)


async def require_platform_admin(user: User = Depends(get_current_active_user)) -> User:
    """Cross-tenant platform operations (list/create/suspend tenants) — orthogonal
    to `role`/the per-tenant permission matrix. See `User.is_platform_admin`."""
    if not user.is_platform_admin:
        raise PermissionDeniedError("You do not have permission to perform this action")
    return user
