from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class TransportZone(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "transport_zones"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_transport_zones_tenant_name"),)

    name: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
