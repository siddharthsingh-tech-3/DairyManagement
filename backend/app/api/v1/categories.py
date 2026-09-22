import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])

full_dep = require_permission(PermissionFeature.PRODUCTS, PermissionLevel.FULL)


@router.get("")
async def list_categories(_: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)) -> dict:
    rows = await CategoryService(db).list_categories()
    return success_envelope(
        [CategoryResponse(id=c.id, name=c.name, item_count=count).model_dump() for c, count in rows]
    )


@router.post("")
async def create_category(
    payload: CategoryCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    category = await CategoryService(db).create_category(payload, actor.full_name)
    return success_envelope(
        CategoryResponse(id=category.id, name=category.name, item_count=0).model_dump(), "Category created"
    )


@router.patch("/{category_id}")
async def rename_category(
    category_id: uuid.UUID,
    payload: CategoryUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = CategoryService(db)
    category = await service.rename_category(category_id, payload, actor.full_name)
    count = await service.get_item_count(category.name)
    return success_envelope(
        CategoryResponse(id=category.id, name=category.name, item_count=count).model_dump(), "Category updated"
    )


@router.delete("/{category_id}")
async def delete_category(
    category_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await CategoryService(db).delete_category(category_id, actor.full_name)
    return success_envelope(None, "Category deleted")
