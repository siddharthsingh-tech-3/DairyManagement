from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Numeric, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import OfferDiscountType

offer_products = Table(
    "offer_products",
    Base.metadata,
    Column("offer_id", ForeignKey("offers.id", ondelete="CASCADE"), primary_key=True),
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
)


class Offer(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "offers"

    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    discount_type: Mapped[OfferDiscountType] = mapped_column(
        Enum(OfferDiscountType, name="offer_discount_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_till: Mapped[date | None] = mapped_column(Date, nullable=True)
    applies_to_all: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    products: Mapped[list["Product"]] = relationship(secondary=offer_products)  # noqa: F821

    @property
    def product_ids(self) -> list:
        return [p.id for p in self.products]

    @property
    def is_running(self) -> bool:
        if not self.is_active:
            return False
        today = date.today()
        if today < self.valid_from:
            return False
        if self.valid_till and today > self.valid_till:
            return False
        return True
