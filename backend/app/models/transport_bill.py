import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.purchase_item_category import PurchaseItemCategory
from app.models.transport import Transport
from app.models.transport_zone import TransportZone


class TransportBill(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "transport_bills"

    bill_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    transport_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transports.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    vehicle_number: Mapped[str] = mapped_column(String(20), nullable=False)
    zone_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transport_zones.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    purchase_item_category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_item_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    bill_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    transport: Mapped["Transport"] = relationship()
    zone: Mapped["TransportZone"] = relationship()
    category: Mapped["PurchaseItemCategory"] = relationship()
