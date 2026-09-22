import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.order import Order
from app.models.user import User
from app.repositories.vendor_repository import VendorRepository
from app.schemas.order import OrderCreateRequest, OrderResponse, OrderUpdateRequest
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])

view_dep = require_permission(PermissionFeature.ORDERS, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.ORDERS, PermissionLevel.FULL)


async def _to_response(order: Order, db: AsyncSession) -> dict:
    vendor_name = None
    if order.vendor_id is not None:
        vendor = await VendorRepository(db).get_by_id(order.vendor_id)
        vendor_name = vendor.name if vendor else None
    return OrderService.to_response(order, vendor_name).model_dump()


@router.get("")
async def list_orders(
    status: str | None = Query(default=None),
    vendor_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    orders = await OrderService(db).list_orders(user, status, vendor_id)
    return success_envelope([await _to_response(o, db) for o in orders])


@router.post("")
async def create_order(
    payload: OrderCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await OrderService(db).create_order(payload, actor)
    return success_envelope(await _to_response(order, db), "Order created")


@router.get("/{order_id}")
async def get_order(
    order_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await OrderService(db).get_order(order_id)
    return success_envelope(await _to_response(order, db))


@router.patch("/{order_id}")
async def update_order(
    order_id: uuid.UUID,
    payload: OrderUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await OrderService(db).update_order(order_id, payload, actor)
    return success_envelope(await _to_response(order, db), "Order updated")


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await OrderService(db).cancel_order(order_id, actor)
    return success_envelope(await _to_response(order, db), "Order cancelled")
