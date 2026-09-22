import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import LedgerEntryCategory, PermissionFeature, PermissionLevel, UserRole
from app.models.user import User
from app.schemas.ledger_entry import LedgerEntryCreateRequest, LedgerEntryResponse
from app.schemas.report import AuditLogEntryResponse, LatestTransactionResponse, TodaysDemandRowResponse
from app.services.audit_service import AuditService
from app.services.ledger_entry_service import LedgerEntryService
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])

reports_view = require_permission(PermissionFeature.REPORTS, PermissionLevel.VIEW)
reports_full = require_permission(PermissionFeature.REPORTS, PermissionLevel.FULL)


@router.get("/dashboard")
async def get_dashboard(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = ReportService(db)
    if user.role == UserRole.SUPER_ADMIN:
        data = await service.get_admin_dashboard()
    elif user.role == UserRole.VENDOR and user.vendor_id is not None:
        data = await service.get_vendor_dashboard(user.vendor_id)
    elif user.role == UserRole.DRIVER and user.driver_id is not None:
        data = await service.get_driver_dashboard(user.driver_id)
    else:
        data = {}
    return success_envelope(data)


@router.get("/profit-loss")
async def get_profit_loss(
    period_month: date = Query(...),
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await ReportService(db).get_profit_loss(period_month)
    return success_envelope(data)


@router.get("/operational")
async def get_operational_report(
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await ReportService(db).get_operational_report()
    return success_envelope(data)


@router.get("/financial-summary")
async def get_financial_summary(
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await ReportService(db).get_financial_summary()
    return success_envelope(data)


@router.get("/sales-trend")
async def get_sales_trend(
    start: date = Query(...),
    end: date = Query(...),
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await ReportService(db).get_sales_trend(start, end)
    return success_envelope(data)


@router.get("/latest-transactions")
async def get_latest_transactions(
    limit: int = Query(default=10, ge=1, le=50),
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    txns = await ReportService(db).get_latest_transactions(limit)
    return success_envelope([LatestTransactionResponse(**t).model_dump() for t in txns])


@router.get("/todays-demand")
async def get_todays_demand(
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = await ReportService(db).get_todays_demand()
    return success_envelope([TodaysDemandRowResponse(**r).model_dump() for r in rows])


@router.get("/balance-sheet")
async def get_balance_sheet(
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = await ReportService(db).get_balance_sheet()
    return success_envelope(data)


@router.get("/balance-sheet/entries")
async def list_balance_sheet_entries(
    category: LedgerEntryCategory = Query(...),
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    entries = await LedgerEntryService(db).list_by_category(category)
    return success_envelope([LedgerEntryResponse.model_validate(e).model_dump() for e in entries])


@router.post("/balance-sheet/entries")
async def create_balance_sheet_entry(
    payload: LedgerEntryCreateRequest,
    actor: User = Depends(reports_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    entry = await LedgerEntryService(db).create(payload, actor.full_name, actor.id)
    return success_envelope(LedgerEntryResponse.model_validate(entry).model_dump(), "Entry added")


@router.delete("/balance-sheet/entries/{entry_id}")
async def delete_balance_sheet_entry(
    entry_id: uuid.UUID,
    actor: User = Depends(reports_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await LedgerEntryService(db).delete(entry_id, actor.full_name)
    return success_envelope(None, "Entry removed")


@router.get("/audit-log")
async def get_audit_log(
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(reports_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    entries = await AuditService(db).list_recent(limit)
    return success_envelope(
        [
            AuditLogEntryResponse(id=e.id, actor_name=e.actor_name, action=e.action, created_at=e.created_at).model_dump()
            for e in entries
        ]
    )
