import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.purchase_item_category import (
    PurchaseItemCategoryCreateRequest,
    PurchaseItemCategoryResponse,
    PurchaseItemCategoryUpdateRequest,
)
from app.services.purchase_item_category_service import PurchaseItemCategoryService

router = APIRouter(prefix="/purchase-item-categories", tags=["purchase-item-categories"])

view_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.TRANSPORT, PermissionLevel.FULL)


@router.get("")
async def list_purchase_item_categories(
    _: User = Depends(view_dep), db: AsyncSession = Depends(get_db)
) -> dict:
    rows = await PurchaseItemCategoryService(db).list_categories()
    return success_envelope(
        [
            PurchaseItemCategoryResponse(id=c.id, name=c.name, bill_count=count).model_dump()
            for c, count in rows
        ]
    )


@router.post("")
async def create_purchase_item_category(
    payload: PurchaseItemCategoryCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    category = await PurchaseItemCategoryService(db).create_category(payload, actor.full_name)
    return success_envelope(
        PurchaseItemCategoryResponse(id=category.id, name=category.name, bill_count=0).model_dump(),
        "Purchase item category created",
    )


@router.patch("/{category_id}")
async def rename_purchase_item_category(
    category_id: uuid.UUID,
    payload: PurchaseItemCategoryUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = PurchaseItemCategoryService(db)
    category = await service.rename_category(category_id, payload, actor.full_name)
    count = await service.get_bill_count(category.id)
    return success_envelope(
        PurchaseItemCategoryResponse(id=category.id, name=category.name, bill_count=count).model_dump(),
        "Purchase item category updated",
    )


@router.delete("/{category_id}")
async def delete_purchase_item_category(
    category_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await PurchaseItemCategoryService(db).delete_category(category_id, actor.full_name)
    return success_envelope(None, "Purchase item category deleted")
