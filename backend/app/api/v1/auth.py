from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    tokens = await AuthService(db).login(payload.email, payload.password)
    return success_envelope(TokenResponse.model_validate(tokens).model_dump(), "Login successful")


@router.post("/refresh")
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> dict:
    tokens = await AuthService(db).refresh(payload.refresh_token)
    return success_envelope(TokenResponse.model_validate(tokens).model_dump(), "Token refreshed")


@router.post("/logout")
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)) -> dict:
    await AuthService(db).logout(payload.refresh_token)
    return success_envelope(None, "Logged out")


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict:
    await AuthService(db).forgot_password(payload.email)
    return success_envelope(None, "If that email exists, a reset link has been sent")


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> dict:
    await AuthService(db).reset_password(payload.token, payload.new_password)
    return success_envelope(None, "Password reset successful")


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await AuthService(db).change_password(user, payload.current_password, payload.new_password)
    return success_envelope(None, "Password changed")


@router.get("/me")
async def me(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)) -> dict:
    tenant = await db.get(Tenant, user.tenant_id)
    response = UserResponse.model_validate(user).model_copy(update={"tenant_name": tenant.name if tenant else None})
    return success_envelope(response.model_dump())
