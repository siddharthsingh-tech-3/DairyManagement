import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.models.crate import CrateTransaction
from app.models.delivery import Delivery, DeliveryExtraItem
from app.models.enums import CrateTxnType, DeliveryStatus, ExtraItemRequestedBy, OrderStatus, UserRole
from app.models.order import Order
from app.models.user import User
from app.repositories.crate_repository import CrateRepository
from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.delivery import DispatchRequest, ExtraItemRequest, MarkDeliveredRequest
from app.services.audit_service import AuditService
from app.services.product_service import ProductService

CRATE_CAPACITY = 24


class DeliveryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = DeliveryRepository(db)
        self.orders = OrderRepository(db)
        self.products = ProductRepository(db)
        self.vendors = VendorRepository(db)
        self.crates = CrateRepository(db)
        self.audit = AuditService(db)

    async def get_delivery(self, delivery_id: uuid.UUID) -> tuple[Delivery, Order]:
        delivery = await self.repo.get_by_id(delivery_id)
        if delivery is None:
            raise NotFoundError("Delivery not found")
        order = await self.orders.get_by_id(delivery.order_id)
        if order is None:
            raise NotFoundError("Order not found")
        return delivery, order

    async def list_deliveries(self, requester: User) -> list[tuple[Delivery, Order]]:
        driver_scope = requester.driver_id if requester.role == UserRole.DRIVER else None
        vendor_scope = requester.vendor_id if requester.role == UserRole.VENDOR else None
        return await self.repo.list_all(driver_id=driver_scope, vendor_id=vendor_scope)

    async def dispatch(self, delivery_id: uuid.UUID, data: DispatchRequest, actor: User) -> Delivery:
        delivery, order = await self.get_delivery(delivery_id)
        delivery.driver_id = data.driver_id
        delivery.zone = data.zone
        delivery.truck_number = data.truck_number
        delivery.status = DeliveryStatus.DISPATCHED
        order.status = OrderStatus.DISPATCHED
        self.audit.log(
            actor.full_name,
            f"dispatched {order.order_no} to {data.zone.value} on {data.truck_number}",
            entity_type="order",
            entity_id=order.id,
        )
        await self.db.commit()
        return delivery

    async def mark_delivered(
        self, delivery_id: uuid.UUID, data: MarkDeliveredRequest, actor: User
    ) -> Delivery:
        delivery, order = await self.get_delivery(delivery_id)
        if actor.role == UserRole.DRIVER and delivery.driver_id != actor.driver_id:
            raise PermissionDeniedError("This delivery is not assigned to you")

        delivery.delivered_quantity = data.delivered_quantity
        delivery.crates_out = data.crates_out
        delivery.crates_in = data.crates_in
        delivery.status = DeliveryStatus.DELIVERED
        delivery.delivered_at = datetime.now(timezone.utc)
        order.status = OrderStatus.DELIVERED

        product_service = ProductService(self.db)
        for item in order.items:
            await product_service.consume_stock(item.product_id, item.quantity, "order", order.id)

        extra_total = 0
        for extra in data.extra_items:
            delivery.extra_items.append(
                DeliveryExtraItem(
                    product_id=extra.product_id, quantity=extra.quantity, requested_by=ExtraItemRequestedBy.DRIVER
                )
            )
            await product_service.consume_stock(extra.product_id, extra.quantity, "delivery", delivery.id)
            extra_total += extra.quantity

        if order.vendor_id is not None:
            vendor = await self.vendors.get_by_id(order.vendor_id)
            if vendor is not None:
                if data.crates_out:
                    self.crates.add_transaction(
                        _crate_txn(vendor.id, CrateTxnType.ISSUE, data.crates_out, "Full crates loaded", actor.id)
                    )
                    vendor.crates_with_vendor += data.crates_out
                if data.crates_in:
                    self.crates.add_transaction(
                        _crate_txn(vendor.id, CrateTxnType.RETURN, data.crates_in, "Empties collected", actor.id)
                    )
                    vendor.crates_with_vendor = max(0, vendor.crates_with_vendor - data.crates_in)

        suffix = f" (+{extra_total} extra)" if extra_total else ""
        self.audit.log(
            actor.full_name,
            f"marked {order.order_no} delivered — {data.delivered_quantity} pkt{suffix} · "
            f"crates {data.crates_out} out / {data.crates_in} in",
            entity_type="order",
            entity_id=order.id,
        )
        await self.db.commit()
        return delivery

    async def confirm_receipt(self, delivery_id: uuid.UUID, actor: User) -> Delivery:
        delivery, order = await self.get_delivery(delivery_id)
        if actor.role == UserRole.VENDOR and order.vendor_id != actor.vendor_id:
            raise PermissionDeniedError("This delivery does not belong to you")
        delivery.status = DeliveryStatus.CONFIRMED
        delivery.confirmed_at = datetime.now(timezone.utc)
        order.status = OrderStatus.CONFIRMED
        self.audit.log(actor.full_name, f"confirmed receipt of {order.order_no}", entity_type="order", entity_id=order.id)
        await self.db.commit()
        return delivery

    async def request_extra(self, delivery_id: uuid.UUID, items: list[ExtraItemRequest], actor: User) -> Delivery:
        delivery, order = await self.get_delivery(delivery_id)
        if actor.role == UserRole.VENDOR and order.vendor_id != actor.vendor_id:
            raise PermissionDeniedError("This delivery does not belong to you")
        total = 0
        for extra in items:
            delivery.extra_items.append(
                DeliveryExtraItem(
                    product_id=extra.product_id, quantity=extra.quantity, requested_by=ExtraItemRequestedBy.VENDOR
                )
            )
            total += extra.quantity
        self.audit.log(
            actor.full_name, f"requested {total} pkt extra milk for delivery", entity_type="order", entity_id=order.id
        )
        await self.db.commit()
        return delivery


def _crate_txn(
    vendor_id: uuid.UUID, txn_type: CrateTxnType, quantity: int, note: str, actor_id: uuid.UUID
) -> CrateTransaction:
    return CrateTransaction(vendor_id=vendor_id, txn_type=txn_type, quantity=quantity, note=note, created_by=actor_id)
