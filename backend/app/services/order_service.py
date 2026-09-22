import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BusinessRuleError, NotFoundError, PermissionDeniedError
from app.models.delivery import Delivery
from app.models.enums import DeliveryStatus, LedgerEntryType, OrderStatus, OrderType, PaymentMethod, UserRole
from app.models.order import Order, OrderItem
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.order import OrderCreateRequest, OrderResponse, OrderUpdateRequest
from app.services.audit_service import AuditService
from app.services.vendor_service import VendorService

CRATE_CAPACITY = 24  # packets per crate, used only as a fallback estimate


def is_order_editable(order: Order) -> bool:
    if order.status not in (OrderStatus.SCHEDULED, OrderStatus.DRAFT):
        return False
    if order.order_type == OrderType.RECURRING or order.delivery_date is None:
        return True
    days_out = (order.delivery_date - date.today()).days
    return days_out > settings.SCHEDULED_ORDER_EDIT_CUTOFF_DAYS


class OrderService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.orders = OrderRepository(db)
        self.products = ProductRepository(db)
        self.vendors = VendorRepository(db)
        self.audit = AuditService(db)

    def _validate_timing(self, order_type: OrderType, delivery_date: date | None) -> None:
        if order_type == OrderType.RECURRING or delivery_date is None:
            return
        now = datetime.now(timezone.utc)
        today = now.date()
        if delivery_date < today:
            raise BusinessRuleError("Delivery date cannot be in the past")
        if delivery_date == today and now.hour >= settings.SAME_DAY_ORDER_CUTOFF_HOUR:
            raise BusinessRuleError(
                f"Same-day orders are blocked after {settings.SAME_DAY_ORDER_CUTOFF_HOUR}:00"
            )
        if delivery_date == today + timedelta(days=1) and now.hour >= settings.NEXT_DAY_ORDER_CUTOFF_HOUR:
            raise BusinessRuleError(
                f"Next-day orders close at {settings.NEXT_DAY_ORDER_CUTOFF_HOUR}:00"
            )

    async def create_order(self, data: OrderCreateRequest, actor: User) -> Order:
        if actor.role == UserRole.VENDOR:
            # A vendor can only ever order for their own account — never trust
            # a client-supplied vendor_id/walk-in for this role, regardless of
            # what the frontend sends.
            if actor.vendor_id is None:
                raise PermissionDeniedError("Your account is not linked to a vendor")
            if data.vendor_id is not None and data.vendor_id != actor.vendor_id:
                raise PermissionDeniedError("You can only create orders for your own vendor account")
            if data.vendor_id is None and data.walkin_customer_name:
                raise PermissionDeniedError("Vendors cannot create walk-in customer orders")
            data = data.model_copy(update={"vendor_id": actor.vendor_id, "walkin_customer_name": None})

        self._validate_timing(data.order_type, data.delivery_date)

        vendor = None
        needs_approval = False
        if data.vendor_id is not None:
            vendor = await self.vendors.get_by_id(data.vendor_id)
            if vendor is None:
                raise NotFoundError("Vendor not found")

        order = Order(
            order_no=await self.orders.next_order_no(),
            vendor_id=data.vendor_id,
            walkin_customer_name=None if data.vendor_id else data.walkin_customer_name,
            is_walkin=data.vendor_id is None,
            order_type=data.order_type,
            recurrence_frequency=data.recurrence_frequency,
            delivery_date=data.delivery_date,
            status=OrderStatus.SCHEDULED,
            payment_method=data.payment_method,
            created_by=actor.id,
        )

        total_crates = 0
        total_amount = Decimal("0")
        for item_in in data.items:
            product = await self.products.get_by_id(item_in.product_id)
            if product is None:
                raise NotFoundError(f"Product {item_in.product_id} not found")
            crates_qty = item_in.crates_qty or max(1, -(-item_in.quantity // CRATE_CAPACITY))
            item = OrderItem(
                product_id=product.id,
                quantity=item_in.quantity,
                rate_snapshot=product.rate,
                gst_percent_snapshot=product.gst_percent,
                crates_qty=crates_qty,
            )
            order.items.append(item)
            total_crates += crates_qty
            total_amount += item.line_total
        order.total_crates = total_crates

        if vendor is not None:
            needs_approval = (vendor.outstanding_balance + total_amount) > vendor.credit_limit > 0
            order.needs_approval = needs_approval
            if data.payment_method == PaymentMethod.PAY_LATER:
                vendor_service = VendorService(self.db)
                await vendor_service.post_ledger_entry(
                    vendor,
                    LedgerEntryType.ADJUSTMENT,
                    f"Order {order.order_no} — on account",
                    debit=total_amount,
                    reference_type="order",
                    reference_number=order.order_no,
                    status=order.status.value,
                    created_by=actor.id,
                )

        order.delivery = Delivery(status=DeliveryStatus.PENDING, crates_out=total_crates)
        self.orders.add(order)

        who = vendor.name if vendor else f"{data.walkin_customer_name} (walk-in)"
        label = {"upi": "UPI", "cod": "Cash on delivery", "pay_later": "Pay later"}[data.payment_method.value]
        self.audit.log(actor.full_name, f"created {order.order_no} for {who} · {label}")

        await self.db.commit()
        return await self.get_order(order.id)

    async def get_order(self, order_id: uuid.UUID) -> Order:
        order = await self.orders.get_by_id(order_id)
        if order is None:
            raise NotFoundError("Order not found")
        return order

    @staticmethod
    def _assert_can_mutate(order: Order, actor: User) -> None:
        if actor.role == UserRole.VENDOR and order.vendor_id != actor.vendor_id:
            raise PermissionDeniedError("You can only manage your own orders")

    async def list_orders(
        self, requester: User, status: str | None = None, vendor_id: uuid.UUID | None = None
    ) -> list[Order]:
        vendor_scope = requester.vendor_id if requester.role.value == "vendor" else vendor_id
        return await self.orders.list_orders(vendor_id=vendor_scope, status=status)

    async def update_order(self, order_id: uuid.UUID, data: OrderUpdateRequest, actor: User) -> Order:
        order = await self.get_order(order_id)
        self._assert_can_mutate(order, actor)
        if not is_order_editable(order):
            raise BusinessRuleError(f"{order.order_no} is editable until 1 day before delivery")
        if data.delivery_date is not None:
            self._validate_timing(order.order_type, data.delivery_date)
            order.delivery_date = data.delivery_date

        order.items.clear()
        total_crates = 0
        for item_in in data.items:
            product = await self.products.get_by_id(item_in.product_id)
            if product is None:
                raise NotFoundError(f"Product {item_in.product_id} not found")
            crates_qty = item_in.crates_qty or max(1, -(-item_in.quantity // CRATE_CAPACITY))
            order.items.append(
                OrderItem(
                    product_id=product.id,
                    quantity=item_in.quantity,
                    rate_snapshot=product.rate,
                    gst_percent_snapshot=product.gst_percent,
                    crates_qty=crates_qty,
                )
            )
            total_crates += crates_qty
        order.total_crates = total_crates

        self.audit.log(actor.full_name, f"edited {order.order_no}", entity_type="order", entity_id=order.id)
        await self.db.commit()
        return await self.get_order(order.id)

    async def cancel_order(self, order_id: uuid.UUID, actor: User) -> Order:
        order = await self.get_order(order_id)
        self._assert_can_mutate(order, actor)
        if order.status in (OrderStatus.DELIVERED, OrderStatus.CONFIRMED, OrderStatus.CANCELLED):
            raise BusinessRuleError(f"{order.order_no} can no longer be cancelled")
        order.status = OrderStatus.CANCELLED
        self.audit.log(actor.full_name, f"cancelled {order.order_no}", entity_type="order", entity_id=order.id)
        await self.db.commit()
        return await self.get_order(order.id)

    @staticmethod
    def to_response(order: Order, vendor_name: str | None) -> OrderResponse:
        return OrderResponse(
            id=order.id,
            order_no=order.order_no,
            vendor_id=order.vendor_id,
            vendor_name=vendor_name,
            walkin_customer_name=order.walkin_customer_name,
            is_walkin=order.is_walkin,
            order_type=order.order_type,
            recurrence_frequency=order.recurrence_frequency,
            delivery_date=order.delivery_date,
            status=order.status,
            payment_method=order.payment_method,
            total_crates=order.total_crates,
            needs_approval=order.needs_approval,
            items=list(order.items),
            total_quantity=order.total_quantity,
            total_amount=order.total_amount,
            is_editable=is_order_editable(order),
            created_at=order.created_at,
        )
