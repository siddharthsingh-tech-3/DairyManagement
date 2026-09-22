import uuid
from decimal import Decimal

from sqlalchemy import Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import TransportOwnership


class Transport(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "transports"
    __table_args__ = (
        UniqueConstraint("tenant_id", "vehicle_number", name="uq_transports_tenant_vehicle_number"),
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    vehicle_number: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    ownership: Mapped[TransportOwnership] = mapped_column(
        Enum(TransportOwnership, name="transport_ownership", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    measure: Mapped[str] = mapped_column(String(50), nullable=False)
    transport_average: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    diesel_average: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    km_running_track: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
