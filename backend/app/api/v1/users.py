import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_admin
from app.models.user import User
from app.schemas.user import UserCreateRequest, UserResponse, UserSetPasswordRequest, UserUpdateRequest
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
async def list_users(
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    users = await UserService(db, actor.tenant_id).list_users()
    return success_envelope([UserResponse.model_validate(u).model_dump() for u in users])


@router.post("")
async def create_user(
    payload: UserCreateRequest,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await UserService(db, actor.tenant_id).create_user(payload, actor.full_name)
    return success_envelope(UserResponse.model_validate(user).model_dump(), "User created")


@router.patch("/{user_id}")
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdateRequest,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await UserService(db, actor.tenant_id).update_user(user_id, payload, actor.full_name)
    return success_envelope(UserResponse.model_validate(user).model_dump(), "User updated")


@router.post("/{user_id}/set-password")
async def set_user_password(
    user_id: uuid.UUID,
    payload: UserSetPasswordRequest,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await UserService(db, actor.tenant_id).set_password(user_id, payload, actor.full_name)
    return success_envelope(UserResponse.model_validate(user).model_dump(), "Password reset")
