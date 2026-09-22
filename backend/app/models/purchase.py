import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    DebitNoteStatus,
    PaymentMethod,
    PurchaseInvoiceStatus,
    PurchaseOrderStatus,
    PurchaseReturnStatus,
)


class PurchaseOrder(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "purchase_orders"
    __table_args__ = (UniqueConstraint("tenant_id", "po_number", name="uq_purchase_orders_tenant_po_number"),)

    po_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    valid_till: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[PurchaseOrderStatus] = mapped_column(
        Enum(PurchaseOrderStatus, name="purchase_order_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=PurchaseOrderStatus.DRAFT,
        index=True,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    additional_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tds_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tcs_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    round_off: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authorized_signatory_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    authorized_signatory_signature_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        back_populates="purchase_order", cascade="all, delete-orphan"
    )


class PurchaseOrderItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "purchase_order_items"

    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(150), nullable=False)
    hsn_code: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"), nullable=False)
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")


class PurchaseInvoice(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "purchase_invoices"
    __table_args__ = (
        UniqueConstraint("tenant_id", "invoice_number", name="uq_purchase_invoices_tenant_invoice_number"),
    )

    invoice_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_invoice_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    purchase_order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True
    )
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tds_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tcs_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    round_off: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    additional_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    status: Mapped[PurchaseInvoiceStatus] = mapped_column(
        Enum(PurchaseInvoiceStatus, name="purchase_invoice_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=PurchaseInvoiceStatus.UNPAID,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authorized_signatory_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    authorized_signatory_signature_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["PurchaseInvoiceItem"]] = relationship(
        back_populates="purchase_invoice", cascade="all, delete-orphan"
    )


class PurchaseInvoiceItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "purchase_invoice_items"

    purchase_invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_invoices.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(150), nullable=False)
    hsn_code: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"), nullable=False)
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_invoice: Mapped["PurchaseInvoice"] = relationship(back_populates="items")


class PaymentOut(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "payments_out"
    __table_args__ = (
        UniqueConstraint("tenant_id", "payment_number", name="uq_payments_out_tenant_payment_number"),
    )

    payment_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    purchase_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_invoices.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    allocations: Mapped[list["PaymentOutAllocation"]] = relationship(
        back_populates="payment_out", cascade="all, delete-orphan"
    )


class PaymentOutAllocation(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "payment_out_allocations"

    payment_out_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payments_out.id", ondelete="CASCADE"), nullable=False, index=True
    )
    purchase_invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_invoices.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)

    payment_out: Mapped["PaymentOut"] = relationship(back_populates="allocations")


class PurchaseReturn(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "purchase_returns"
    __table_args__ = (
        UniqueConstraint("tenant_id", "return_number", name="uq_purchase_returns_tenant_return_number"),
    )

    return_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    purchase_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_invoices.id", ondelete="SET NULL"), nullable=True
    )
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_in: Mapped[date | None] = mapped_column(Date, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tds_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tcs_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    round_off: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    additional_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    status: Mapped[PurchaseReturnStatus] = mapped_column(
        Enum(PurchaseReturnStatus, name="purchase_return_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=PurchaseReturnStatus.COMPLETED,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authorized_signatory_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    authorized_signatory_signature_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["PurchaseReturnItem"]] = relationship(
        back_populates="purchase_return", cascade="all, delete-orphan"
    )


class PurchaseReturnItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "purchase_return_items"

    purchase_return_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("purchase_returns.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(150), nullable=False)
    hsn_code: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_return: Mapped["PurchaseReturn"] = relationship(back_populates="items")


class DebitNote(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "debit_notes"
    __table_args__ = (
        UniqueConstraint("tenant_id", "debit_note_number", name="uq_debit_notes_tenant_debit_note_number"),
    )

    debit_note_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    purchase_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_invoices.id", ondelete="SET NULL"), nullable=True
    )
    purchase_return_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("purchase_returns.id", ondelete="SET NULL"), nullable=True
    )
    note_date: Mapped[date] = mapped_column(Date, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    additional_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tds_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tcs_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    round_off: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    status: Mapped[DebitNoteStatus] = mapped_column(
        Enum(DebitNoteStatus, name="debit_note_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=DebitNoteStatus.COMPLETED,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authorized_signatory_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    authorized_signatory_signature_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["DebitNoteItem"]] = relationship(back_populates="debit_note", cascade="all, delete-orphan")


class DebitNoteItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "debit_note_items"

    debit_note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("debit_notes.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(String(150), nullable=False)
    hsn_code: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[int] = mapped_column(nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    debit_note: Mapped["DebitNote"] = relationship(back_populates="items")
