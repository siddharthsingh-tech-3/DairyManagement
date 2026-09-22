import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.product import (
    ProductBulkCreateRequest,
    ProductBulkUpdateRequest,
    ProductCreateRequest,
    ProductResponse,
    ProductUpdateRequest,
    StockAdjustmentRequest,
)
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])

full_dep = require_permission(PermissionFeature.PRODUCTS, PermissionLevel.FULL)


@router.get("")
async def list_products(_: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)) -> dict:
    # Unlike stock management (create/update/reorder, gated by the "products"
    # permission below), the catalog itself is readable by any authenticated
    # user — vendors need it to pick items when scheduling an order, drivers
    # need it to log extra items at delivery.
    products = await ProductService(db).list_products()
    return success_envelope([ProductResponse.model_validate(p).model_dump() for p in products])


@router.post("")
async def create_product(
    payload: ProductCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    product = await ProductService(db).create_product(payload, actor.full_name)
    return success_envelope(ProductResponse.model_validate(product).model_dump(), "Product added")


@router.post("/bulk")
async def bulk_create_products(
    payload: ProductBulkCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    products = await ProductService(db).bulk_create_products(payload.items, actor.full_name)
    return success_envelope(
        [ProductResponse.model_validate(p).model_dump() for p in products], f"{len(products)} items added"
    )


@router.patch("/bulk")
async def bulk_update_products(
    payload: ProductBulkUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    products = await ProductService(db).bulk_update_products(payload.ids, payload.updates, actor.full_name)
    return success_envelope(
        [ProductResponse.model_validate(p).model_dump() for p in products], f"{len(products)} items updated"
    )


@router.patch("/{product_id}")
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    product = await ProductService(db).update_product(product_id, payload, actor.full_name)
    return success_envelope(ProductResponse.model_validate(product).model_dump(), "Product updated")


@router.post("/{product_id}/stock-movements")
async def adjust_stock(
    product_id: uuid.UUID,
    payload: StockAdjustmentRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    product = await ProductService(db).adjust_stock(product_id, payload, actor.full_name, actor.id)
    return success_envelope(ProductResponse.model_validate(product).model_dump(), "Stock updated")


@router.post("/{product_id}/reorder")
async def reorder_stock(
    product_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    product = await ProductService(db).reorder_stock(product_id, actor.full_name, actor.id)
    return success_envelope(ProductResponse.model_validate(product).model_dump(), "Purchase order raised — stock replenished")
