import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission, require_role
from app.models.delivery import Delivery
from app.models.enums import PermissionFeature, PermissionLevel, UserRole
from app.models.order import Order
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.delivery import (
    DeliveryOrderItemResponse,
    DeliveryResponse,
    DispatchRequest,
    MarkDeliveredRequest,
    RequestExtraItemsRequest,
)
from app.services.delivery_service import DeliveryService

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

# "delivery" permission governs the staff/driver dispatch board (Delivery Management /
# My Deliveries). A vendor confirming their own receipt or requesting extras acts within
# their own order's scope, not the dispatch-board feature, so those two routes are gated
# by role + an ownership check in the service layer instead. Listing is open to any
# authenticated user and scoped server-side (see DeliveryService.list_deliveries).
full_dep = require_permission(PermissionFeature.DELIVERY, PermissionLevel.FULL)
vendor_or_admin_dep = require_role(UserRole.SUPER_ADMIN, UserRole.VENDOR)


async def _to_response(delivery: Delivery, order: Order, db: AsyncSession) -> dict:
    vendor_name = order.walkin_customer_name
    if order.vendor_id is not None:
        vendor = await VendorRepository(db).get_by_id(order.vendor_id)
        vendor_name = vendor.name if vendor else None

    driver_name = None
    if delivery.driver_id is not None:
        from app.models.driver import Driver

        driver = await db.get(Driver, delivery.driver_id)
        driver_name = driver.name if driver else None

    products = ProductRepository(db)
    items = []
    for item in order.items:
        product = await products.get_by_id(item.product_id)
        items.append(
            DeliveryOrderItemResponse(
                product_id=item.product_id,
                product_name=product.name if product else "Unknown product",
                quantity=item.quantity,
                crates_qty=item.crates_qty,
            )
        )

    return DeliveryResponse(
        id=delivery.id,
        order_id=order.id,
        order_no=order.order_no,
        vendor_name=vendor_name,
        driver_id=delivery.driver_id,
        driver_name=driver_name,
        zone=delivery.zone,
        truck_number=delivery.truck_number,
        status=delivery.status,
        delivered_quantity=delivery.delivered_quantity,
        crates_out=delivery.crates_out,
        crates_in=delivery.crates_in,
        items=items,
        extra_items=list(delivery.extra_items),
        delivered_at=delivery.delivered_at,
        confirmed_at=delivery.confirmed_at,
    ).model_dump()


@router.get("")
async def list_deliveries(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Scoped server-side: admin sees all, driver sees their assigned stops, vendor
    # sees only their own orders' deliveries (see DeliveryService.list_deliveries).
    deliveries = await DeliveryService(db).list_deliveries(user)
    return success_envelope([await _to_response(d, o, db) for d, o in deliveries])


@router.post("/{delivery_id}/dispatch")
async def dispatch(
    delivery_id: uuid.UUID,
    payload: DispatchRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    delivery = await DeliveryService(db).dispatch(delivery_id, payload, actor)
    delivery, order = await DeliveryService(db).get_delivery(delivery.id)
    return success_envelope(await _to_response(delivery, order, db), "Order dispatched")


@router.post("/{delivery_id}/deliver")
async def mark_delivered(
    delivery_id: uuid.UUID,
    payload: MarkDeliveredRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    delivery = await DeliveryService(db).mark_delivered(delivery_id, payload, actor)
    delivery, order = await DeliveryService(db).get_delivery(delivery.id)
    return success_envelope(await _to_response(delivery, order, db), "Marked delivered — awaiting vendor confirmation")


@router.post("/{delivery_id}/confirm")
async def confirm_receipt(
    delivery_id: uuid.UUID,
    actor: User = Depends(vendor_or_admin_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    delivery = await DeliveryService(db).confirm_receipt(delivery_id, actor)
    delivery, order = await DeliveryService(db).get_delivery(delivery.id)
    return success_envelope(await _to_response(delivery, order, db), "Receipt confirmed ✓")


@router.post("/{delivery_id}/request-extra")
async def request_extra(
    delivery_id: uuid.UUID,
    payload: RequestExtraItemsRequest,
    actor: User = Depends(vendor_or_admin_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    delivery = await DeliveryService(db).request_extra(delivery_id, payload.extra_items, actor)
    delivery, order = await DeliveryService(db).get_delivery(delivery.id)
    return success_envelope(await _to_response(delivery, order, db), "Request sent to distributor")
