import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.expense_category import (
    ExpenseCategoryCreateRequest,
    ExpenseCategoryResponse,
    ExpenseCategoryUpdateRequest,
)
from app.services.expense_category_service import ExpenseCategoryService

router = APIRouter(prefix="/expense-categories", tags=["expense-categories"])

view_dep = require_permission(PermissionFeature.EXPENSES, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.EXPENSES, PermissionLevel.FULL)


@router.get("")
async def list_expense_categories(_: User = Depends(view_dep), db: AsyncSession = Depends(get_db)) -> dict:
    rows = await ExpenseCategoryService(db).list_categories()
    return success_envelope(
        [ExpenseCategoryResponse(id=c.id, name=c.name, item_count=count).model_dump() for c, count in rows]
    )


@router.post("")
async def create_expense_category(
    payload: ExpenseCategoryCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    category = await ExpenseCategoryService(db).create_category(payload, actor.full_name)
    return success_envelope(
        ExpenseCategoryResponse(id=category.id, name=category.name, item_count=0).model_dump(),
        "Expense category created",
    )


@router.patch("/{category_id}")
async def rename_expense_category(
    category_id: uuid.UUID,
    payload: ExpenseCategoryUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = ExpenseCategoryService(db)
    category = await service.rename_category(category_id, payload, actor.full_name)
    count = await service.get_item_count(category.name)
    return success_envelope(
        ExpenseCategoryResponse(id=category.id, name=category.name, item_count=count).model_dump(),
        "Expense category updated",
    )


@router.delete("/{category_id}")
async def delete_expense_category(
    category_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ExpenseCategoryService(db).delete_category(category_id, actor.full_name)
    return success_envelope(None, "Expense category deleted")
