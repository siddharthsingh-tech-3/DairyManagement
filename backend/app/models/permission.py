from sqlalchemy import Enum, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import PermissionLevel, UserRole


class Permission(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "permissions"
    __table_args__ = (
        UniqueConstraint("tenant_id", "feature", "role", name="uq_permissions_tenant_feature_role"),
    )

    feature: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    level: Mapped[PermissionLevel] = mapped_column(
        Enum(PermissionLevel, name="permission_level", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
