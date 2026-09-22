import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.transport_bill import TransportBill
from app.models.user import User
from app.schemas.transport_bill import (
    TransportBillCreateRequest,
    TransportBillResponse,
    TransportBillUpdateRequest,
)
from app.services.transport_bill_service import TransportBillService

router = APIRouter(prefix="/transport-bills", tags=["transport-bills"])

view_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.FULL)


def _to_response(bill: TransportBill) -> TransportBillResponse:
    return TransportBillResponse(
        id=bill.id,
        bill_date=bill.bill_date,
        transport_id=bill.transport_id,
        transport_name=bill.transport.name,
        vehicle_number=bill.vehicle_number,
        zone_id=bill.zone_id,
        zone_name=bill.zone.name,
        purchase_item_category_id=bill.purchase_item_category_id,
        category_name=bill.category.name,
        bill_number=bill.bill_number,
        amount=bill.amount,
        note=bill.note,
        created_at=bill.created_at,
    )


@router.get("")
async def list_transport_bills(
    start: date | None = Query(None),
    end: date | None = Query(None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    bills = await TransportBillService(db).list_bills(start, end)
    return success_envelope([_to_response(b).model_dump() for b in bills])


@router.post("")
async def create_transport_bill(
    payload: TransportBillCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    bill = await TransportBillService(db).create_bill(payload, actor.full_name, actor.id)
    return success_envelope(_to_response(bill).model_dump(), "Transport bill logged")


@router.get("/{bill_id}")
async def get_transport_bill(
    bill_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    bill = await TransportBillService(db).get_bill(bill_id)
    return success_envelope(_to_response(bill).model_dump())


@router.put("/{bill_id}")
async def update_transport_bill(
    bill_id: uuid.UUID,
    payload: TransportBillUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    bill = await TransportBillService(db).update_bill(bill_id, payload, actor.full_name)
    return success_envelope(_to_response(bill).model_dump(), "Transport bill updated")


@router.delete("/{bill_id}")
async def delete_transport_bill(
    bill_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await TransportBillService(db).delete_bill(bill_id, actor.full_name)
    return success_envelope(None, "Transport bill deleted")
