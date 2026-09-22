import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.transport_zone import (
    TransportZoneCreateRequest,
    TransportZoneResponse,
    TransportZoneUpdateRequest,
)
from app.services.transport_zone_service import TransportZoneService

router = APIRouter(prefix="/transport-zones", tags=["transport-zones"])

view_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.FULL)


@router.get("")
async def list_transport_zones(_: User = Depends(view_dep), db: AsyncSession = Depends(get_db)) -> dict:
    rows = await TransportZoneService(db).list_zones()
    return success_envelope(
        [TransportZoneResponse(id=z.id, name=z.name, bill_count=count).model_dump() for z, count in rows]
    )


@router.post("")
async def create_transport_zone(
    payload: TransportZoneCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    zone = await TransportZoneService(db).create_zone(payload, actor.full_name)
    return success_envelope(
        TransportZoneResponse(id=zone.id, name=zone.name, bill_count=0).model_dump(), "Transport zone created"
    )


@router.patch("/{zone_id}")
async def rename_transport_zone(
    zone_id: uuid.UUID,
    payload: TransportZoneUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = TransportZoneService(db)
    zone = await service.rename_zone(zone_id, payload, actor.full_name)
    count = await service.get_bill_count(zone.id)
    return success_envelope(
        TransportZoneResponse(id=zone.id, name=zone.name, bill_count=count).model_dump(),
        "Transport zone updated",
    )


@router.delete("/{zone_id}")
async def delete_transport_zone(
    zone_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await TransportZoneService(db).delete_zone(zone_id, actor.full_name)
    return success_envelope(None, "Transport zone deleted")
