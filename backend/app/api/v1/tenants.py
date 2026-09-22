import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_platform_admin
from app.models.user import User
from app.schemas.tenant import TenantCreateRequest, TenantResponse, TenantUpdateRequest
from app.services.tenant_service import TenantService

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("")
async def list_tenants(
    _: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    tenants = await TenantService(db).list_tenants()
    return success_envelope([TenantResponse.model_validate(t).model_dump() for t in tenants])


@router.post("")
async def create_tenant(
    payload: TenantCreateRequest,
    actor: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    tenant = await TenantService(db).create_tenant(
        payload.name,
        payload.slug,
        payload.admin_email,
        payload.admin_name,
        payload.admin_password,
        actor.full_name,
    )
    return success_envelope(TenantResponse.model_validate(tenant).model_dump(), "Tenant provisioned")


@router.patch("/{tenant_id}")
async def update_tenant(
    tenant_id: uuid.UUID,
    payload: TenantUpdateRequest,
    actor: User = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    tenant = await TenantService(db).set_active(tenant_id, payload.is_active, actor.full_name)
    message = "Tenant activated" if payload.is_active else "Tenant deactivated"
    return success_envelope(TenantResponse.model_validate(tenant).model_dump(), message)
