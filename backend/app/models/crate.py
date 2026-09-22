import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, UUIDPrimaryKeyMixin
from app.models.enums import CrateTxnType, DisputeStatus


class CrateTransaction(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "crate_transactions"

    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    txn_type: Mapped[CrateTxnType] = mapped_column(
        Enum(CrateTxnType, name="crate_txn_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    related_delivery_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("deliveries.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)


class CrateDispute(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "crate_disputes"

    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    related_delivery_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("deliveries.id", ondelete="SET NULL"), nullable=True
    )
    driver_reported_qty: Mapped[int] = mapped_column(nullable=False)
    vendor_confirmed_qty: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[DisputeStatus] = mapped_column(
        Enum(DisputeStatus, name="dispute_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=DisputeStatus.OPEN,
        index=True,
    )
    resolution_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
