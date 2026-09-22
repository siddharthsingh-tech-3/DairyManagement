import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import DisputeStatus, PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.crate import (
    CrateDisputeCreateRequest,
    CrateDisputeResolveRequest,
    CrateDisputeResponse,
    CrateReconciliationRequest,
    CrateTransactionResponse,
)
from app.services.crate_service import CrateService

router = APIRouter(prefix="/crates", tags=["crates"])

view_dep = require_permission(PermissionFeature.CRATES, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.CRATES, PermissionLevel.FULL)


@router.get("/summary")
async def get_summary(_: User = Depends(view_dep), db: AsyncSession = Depends(get_db)) -> dict:
    summary = await CrateService(db).get_summary()
    return success_envelope(summary)


@router.get("/transactions")
async def list_transactions(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    txns = await CrateService(db).list_transactions(vendor_id)
    return success_envelope(
        [
            CrateTransactionResponse(
                id=t.id,
                vendor_id=t.vendor_id,
                vendor_name=name,
                txn_type=t.txn_type,
                quantity=t.quantity,
                note=t.note,
                created_at=t.created_at,
            ).model_dump()
            for t, name in txns
        ]
    )


@router.post("/reconcile")
async def reconcile(
    payload: CrateReconciliationRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await CrateService(db).post_reconciliation(payload, actor.full_name, actor.id)
    return success_envelope(None, f"Adjustment posted — {payload.txn_type.value} {payload.quantity} crates")


@router.get("/disputes")
async def list_disputes(
    status: DisputeStatus | None = Query(default=None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    disputes = await CrateService(db).list_disputes(status)
    return success_envelope(
        [
            CrateDisputeResponse(
                id=d.id,
                vendor_id=d.vendor_id,
                vendor_name=name,
                driver_reported_qty=d.driver_reported_qty,
                vendor_confirmed_qty=d.vendor_confirmed_qty,
                status=d.status,
                resolution_note=d.resolution_note,
                created_at=d.created_at,
            ).model_dump()
            for d, name in disputes
        ]
    )


@router.post("/disputes")
async def create_dispute(
    payload: CrateDisputeCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    dispute = await CrateService(db).create_dispute(
        payload.vendor_id,
        payload.driver_reported_qty,
        payload.vendor_confirmed_qty,
        payload.related_delivery_id,
        actor.full_name,
    )
    return success_envelope({"id": str(dispute.id)}, "Dispute flagged")


@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: uuid.UUID,
    payload: CrateDisputeResolveRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    dispute = await CrateService(db).resolve_dispute(dispute_id, payload.resolution_note, actor.full_name, actor.id)
    return success_envelope({"id": str(dispute.id), "status": dispute.status.value}, "Dispute resolved")
