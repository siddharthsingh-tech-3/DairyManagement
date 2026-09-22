import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import OrderStatus, OrderType, PaymentMethod

if TYPE_CHECKING:
    from app.models.delivery import Delivery


class Order(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "orders"
    __table_args__ = (UniqueConstraint("tenant_id", "order_no", name="uq_orders_tenant_order_no"),)

    order_no: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    walkin_customer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    is_walkin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_type: Mapped[OrderType] = mapped_column(
        Enum(OrderType, name="order_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    recurrence_frequency: Mapped[str | None] = mapped_column(String(30), nullable=True)
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=OrderStatus.DRAFT,
        index=True,
    )
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    total_crates: Mapped[int] = mapped_column(default=0, nullable=False)
    needs_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    delivery: Mapped["Delivery | None"] = relationship(back_populates="order", cascade="all, delete-orphan")

    @property
    def total_quantity(self) -> int:
        return sum(item.quantity for item in self.items)

    @property
    def total_amount(self) -> Decimal:
        return sum((item.line_total for item in self.items), Decimal("0"))


class OrderItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(nullable=False)
    rate_snapshot: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    gst_percent_snapshot: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    crates_qty: Mapped[int] = mapped_column(default=0, nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")

    @property
    def line_total(self) -> Decimal:
        base = self.rate_snapshot * self.quantity
        return base + (base * self.gst_percent_snapshot / Decimal("100"))
