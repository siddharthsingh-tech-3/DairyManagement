import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import LoanPartyType, LoanRecordStatus, LoanType, PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.loan import (
    LoanCreateRequest,
    LoanDetailResponse,
    LoanLedgerEntryResponse,
    LoanRepaymentInput,
    LoanRepaymentResponse,
    LoanResponse,
    LoanScheduleInstallmentResponse,
    LoanUpdateRequest,
)
from app.services.loan_service import LoanService

router = APIRouter(prefix="/loans", tags=["loans"])

view_dep = require_permission(PermissionFeature.LOANS, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.LOANS, PermissionLevel.FULL)


@router.get("")
async def list_loans(
    loan_type: LoanType | None = Query(default=None),
    status: LoanRecordStatus | None = Query(default=None),
    party_type: LoanPartyType | None = Query(default=None),
    party_id: uuid.UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    loans = await LoanService(db).list_loans(loan_type, status, party_type, party_id, search)
    return success_envelope([LoanResponse.model_validate(loan).model_dump() for loan in loans])


@router.post("")
async def create_loan(
    payload: LoanCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    loan = await LoanService(db).create_loan(payload, actor.full_name, actor.id)
    return success_envelope(LoanDetailResponse.model_validate(loan).model_dump(), "Loan recorded")


@router.get("/{loan_id}")
async def get_loan(
    loan_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    loan = await LoanService(db).get_loan_detail(loan_id)
    return success_envelope(LoanDetailResponse.model_validate(loan).model_dump())


@router.patch("/{loan_id}")
async def update_loan(
    loan_id: uuid.UUID,
    payload: LoanUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    loan = await LoanService(db).update_loan(loan_id, payload, actor.full_name)
    return success_envelope(LoanResponse.model_validate(loan).model_dump(), "Loan updated")


@router.delete("/{loan_id}")
async def delete_loan(
    loan_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await LoanService(db).delete_loan(loan_id, actor.full_name)
    return success_envelope(None, "Loan deleted")


@router.post("/{loan_id}/cancel")
async def cancel_loan(
    loan_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    loan = await LoanService(db).cancel_loan(loan_id, actor.full_name, actor.id)
    return success_envelope(LoanResponse.model_validate(loan).model_dump(), "Loan cancelled")


@router.get("/{loan_id}/schedule")
async def get_schedule(
    loan_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    schedule = await LoanService(db).get_schedule(loan_id)
    return success_envelope([LoanScheduleInstallmentResponse.model_validate(row).model_dump() for row in schedule])


@router.post("/{loan_id}/repayments")
async def record_repayment(
    loan_id: uuid.UUID,
    payload: LoanRepaymentInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repayment = await LoanService(db).record_repayment(loan_id, payload, actor.full_name, actor.id)
    return success_envelope(LoanRepaymentResponse.model_validate(repayment).model_dump(), "Repayment recorded")


@router.get("/{loan_id}/repayments")
async def get_repayments(
    loan_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    repayments = await LoanService(db).get_repayments(loan_id)
    return success_envelope([LoanRepaymentResponse.model_validate(row).model_dump() for row in repayments])


@router.get("/{loan_id}/ledger-entries")
async def get_ledger_entries(
    loan_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    entries = await LoanService(db).get_ledger_entries(loan_id)
    return success_envelope([LoanLedgerEntryResponse.model_validate(row).model_dump() for row in entries])
