import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DeliveryStatus, DeliveryZone, ExtraItemRequestedBy

if TYPE_CHECKING:
    from app.models.order import Order


class Delivery(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "deliveries"

    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    zone: Mapped[DeliveryZone | None] = mapped_column(
        Enum(DeliveryZone, name="delivery_zone", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    truck_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, name="delivery_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=DeliveryStatus.PENDING,
        index=True,
    )
    delivered_quantity: Mapped[int | None] = mapped_column(nullable=True)
    crates_out: Mapped[int] = mapped_column(default=0, nullable=False)
    crates_in: Mapped[int] = mapped_column(default=0, nullable=False)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="delivery")
    extra_items: Mapped[list["DeliveryExtraItem"]] = relationship(
        back_populates="delivery", cascade="all, delete-orphan"
    )


class DeliveryExtraItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "delivery_extra_items"

    delivery_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("deliveries.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(nullable=False)
    requested_by: Mapped[ExtraItemRequestedBy] = mapped_column(
        Enum(
            ExtraItemRequestedBy,
            name="extra_item_requested_by",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )

    delivery: Mapped["Delivery"] = relationship(back_populates="extra_items")
