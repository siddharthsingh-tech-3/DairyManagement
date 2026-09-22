from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.services.transport_report_service import TransportReportService

router = APIRouter(prefix="/transport-reports", tags=["transport-reports"])

view_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.VIEW)


@router.get("/summary")
async def get_transport_summary(
    start: date | None = Query(None),
    end: date | None = Query(None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await TransportReportService(db).get_summary(start, end)
    return success_envelope(data.model_dump())


@router.get("/zone-wise")
async def get_zone_wise_report(
    start: date | None = Query(None),
    end: date | None = Query(None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = await TransportReportService(db).get_zone_wise(start, end)
    return success_envelope([r.model_dump() for r in rows])


@router.get("/category-wise")
async def get_category_wise_report(
    start: date | None = Query(None),
    end: date | None = Query(None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = await TransportReportService(db).get_category_wise(start, end)
    return success_envelope([r.model_dump() for r in rows])
