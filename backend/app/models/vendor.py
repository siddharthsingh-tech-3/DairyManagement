import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import LedgerEntryType

if TYPE_CHECKING:
    from app.models.user import User


class Vendor(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "vendors"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_vendors_tenant_code"),)

    code: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    contact_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    area: Mapped[str] = mapped_column(String(100), nullable=False)
    route: Mapped[str] = mapped_column(String(50), nullable=False)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(10), nullable=True)

    billing_street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    billing_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    billing_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    billing_pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    shipping_street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shipping_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    credit_period_days: Mapped[int] = mapped_column(default=0, nullable=False)
    credit_limit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    crates_with_vendor: Mapped[int] = mapped_column(default=0, nullable=False)
    vendor_since: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_supplier: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    users: Mapped[list["User"]] = relationship(
        back_populates="vendor", foreign_keys="User.vendor_id"
    )
    ledger_entries: Mapped[list["VendorLedgerEntry"]] = relationship(
        back_populates="vendor", cascade="all, delete-orphan", order_by="desc(VendorLedgerEntry.created_at)"
    )
    bank_accounts: Mapped[list["VendorBankAccount"]] = relationship(
        back_populates="vendor", cascade="all, delete-orphan"
    )
    custom_fields: Mapped[list["VendorCustomField"]] = relationship(
        back_populates="vendor", cascade="all, delete-orphan"
    )

    @property
    def is_over_credit_limit(self) -> bool:
        return self.credit_limit > 0 and self.outstanding_balance > self.credit_limit


class VendorLedgerEntry(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "vendor_ledger_entries"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    entry_type: Mapped[LedgerEntryType] = mapped_column(
        Enum(LedgerEntryType, name="ledger_entry_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    debit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    credit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tds_deducted_by_party: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tds_deducted_by_self: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    vendor: Mapped["Vendor"] = relationship(back_populates="ledger_entries")


class VendorBankAccount(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "vendor_bank_accounts"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    account_holder_name: Mapped[str] = mapped_column(String(150), nullable=False)
    account_number: Mapped[str] = mapped_column(String(30), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(11), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(150), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    vendor: Mapped["Vendor"] = relationship(back_populates="bank_accounts")


class VendorCustomField(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "vendor_custom_fields"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    field_value: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    vendor: Mapped["Vendor"] = relationship(back_populates="custom_fields")
