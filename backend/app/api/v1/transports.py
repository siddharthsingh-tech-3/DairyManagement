import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.transport import TransportCreateRequest, TransportResponse, TransportUpdateRequest
from app.services.transport_service import TransportService

router = APIRouter(prefix="/transports", tags=["transports"])

view_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.FULL)


@router.get("")
async def list_transports(_: User = Depends(view_dep), db: AsyncSession = Depends(get_db)) -> dict:
    transports = await TransportService(db).list_transports()
    return success_envelope([TransportResponse.model_validate(t).model_dump() for t in transports])


@router.post("")
async def create_transport(
    payload: TransportCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    transport = await TransportService(db).create_transport(payload, actor.full_name, actor.id)
    return success_envelope(TransportResponse.model_validate(transport).model_dump(), "Transport added")


@router.get("/{transport_id}")
async def get_transport(
    transport_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    transport = await TransportService(db).get_transport(transport_id)
    return success_envelope(TransportResponse.model_validate(transport).model_dump())


@router.put("/{transport_id}")
async def update_transport(
    transport_id: uuid.UUID,
    payload: TransportUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    transport = await TransportService(db).update_transport(transport_id, payload, actor.full_name)
    return success_envelope(TransportResponse.model_validate(transport).model_dump(), "Transport updated")


@router.delete("/{transport_id}")
async def delete_transport(
    transport_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await TransportService(db).delete_transport(transport_id, actor.full_name)
    return success_envelope(None, "Transport deleted")
