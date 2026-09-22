import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.expense import ExpenseCreateRequest, ExpenseResponse
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["expenses"])

view_dep = require_permission(PermissionFeature.EXPENSES, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.EXPENSES, PermissionLevel.FULL)


@router.get("")
async def list_expenses(
    start: date | None = Query(None),
    end: date | None = Query(None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    expenses = await ExpenseService(db).list_expenses(start, end)
    return success_envelope([ExpenseResponse.model_validate(e).model_dump() for e in expenses])


@router.post("")
async def create_expense(
    payload: ExpenseCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    expense = await ExpenseService(db).create_expense(payload, actor.full_name, actor.id)
    return success_envelope(ExpenseResponse.model_validate(expense).model_dump(), "Expense logged")


@router.post("/{expense_id}/mark-paid")
async def mark_expense_paid(
    expense_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    expense = await ExpenseService(db).mark_paid(expense_id, actor.full_name)
    return success_envelope(ExpenseResponse.model_validate(expense).model_dump(), "Expense marked as paid")


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ExpenseService(db).delete_expense(expense_id, actor.full_name)
    return success_envelope(None, "Expense deleted")
