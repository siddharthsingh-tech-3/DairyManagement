import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import StockMovementType


class Product(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("tenant_id", "sku", name="uq_products_tenant_sku"),)

    sku: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    item_type: Mapped[str] = mapped_column(String(10), nullable=False, default="product")
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    hsn_code: Mapped[str] = mapped_column(String(10), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    sales_price_includes_tax: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    purchase_price_includes_tax: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    gst_percent: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=Decimal("5.0"))
    discount_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="pkt")
    alternative_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    current_stock: Mapped[int] = mapped_column(default=0, nullable=False)
    opening_stock_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reorder_level: Mapped[int] = mapped_column(default=0, nullable=False)
    low_stock_alert_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    show_in_online_store: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    batch_no: Mapped[str | None] = mapped_column(String(30), nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    stock_movements: Mapped[list["StockMovement"]] = relationship(
        back_populates="product", order_by="desc(StockMovement.created_at)"
    )

    @property
    def is_low_stock(self) -> bool:
        return self.current_stock <= self.reorder_level


class StockMovement(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "stock_movements"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    movement_type: Mapped[StockMovementType] = mapped_column(
        Enum(StockMovementType, name="stock_movement_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    quantity_delta: Mapped[int] = mapped_column(nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    product: Mapped["Product"] = relationship(back_populates="stock_movements")
