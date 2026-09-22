from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.dependencies.permissions import require_admin
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.permission import PermissionEntry, PermissionUpdateRequest
from app.services.permission_service import PermissionService

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.get("")
async def get_matrix(
    # Any authenticated user may read the matrix — the frontend nav for
    # vendor/driver needs to reflect it live rather than relying solely on
    # hardcoded defaults; only mutating it is admin-only (see PUT/cycle below).
    _: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    permissions = await PermissionService(db).get_matrix()
    return success_envelope(
        [PermissionEntry(feature=p.feature, role=p.role, level=p.level).model_dump() for p in permissions]
    )


@router.put("")
async def update_permission(
    payload: PermissionUpdateRequest,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    perm = await PermissionService(db).update_level(payload.feature, payload.role, payload.level, actor.full_name)
    return success_envelope(
        PermissionEntry(feature=perm.feature, role=perm.role, level=perm.level).model_dump(), "Permission updated"
    )


@router.post("/{feature}/{role}/cycle")
async def cycle_permission(
    feature: str,
    role: str,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    perm = await PermissionService(db).cycle_level(feature, UserRole(role), actor.full_name)
    return success_envelope(
        PermissionEntry(feature=perm.feature, role=perm.role, level=perm.level).model_dump(), "Permission updated"
    )
