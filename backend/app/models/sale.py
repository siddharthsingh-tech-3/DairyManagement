import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    CreditNoteStatus,
    DeliveryChallanStatus,
    PaymentMethod,
    ProformaInvoiceStatus,
    QuotationStatus,
    SalesInvoiceStatus,
    SalesReturnStatus,
)


class Quotation(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "quotations"
    __table_args__ = (
        UniqueConstraint("tenant_id", "quote_number", name="uq_quotations_tenant_quote_number"),
    )

    quote_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quote_date: Mapped[date] = mapped_column(Date, nullable=False)
    valid_till: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(QuotationStatus, name="quotation_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=QuotationStatus.DRAFT,
        index=True,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    round_off: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["QuotationItem"]] = relationship(back_populates="quotation", cascade="all, delete-orphan")


class QuotationItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "quotation_items"

    quotation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
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

    quotation: Mapped["Quotation"] = relationship(back_populates="items")


class SalesInvoice(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sales_invoices"
    __table_args__ = (
        UniqueConstraint("tenant_id", "invoice_number", name="uq_sales_invoices_tenant_invoice_number"),
    )

    invoice_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True
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
    status: Mapped[SalesInvoiceStatus] = mapped_column(
        Enum(SalesInvoiceStatus, name="sales_invoice_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=SalesInvoiceStatus.UNPAID,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authorized_signatory_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    authorized_signatory_signature_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["SalesInvoiceItem"]] = relationship(
        back_populates="sales_invoice", cascade="all, delete-orphan"
    )


class SalesInvoiceItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "sales_invoice_items"

    sales_invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_invoices.id", ondelete="CASCADE"), nullable=False
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

    sales_invoice: Mapped["SalesInvoice"] = relationship(back_populates="items")


class PaymentIn(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "payments_in"
    __table_args__ = (
        UniqueConstraint("tenant_id", "payment_number", name="uq_payments_in_tenant_payment_number"),
    )

    payment_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    sales_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sales_invoices.id", ondelete="SET NULL"), nullable=True
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

    allocations: Mapped[list["PaymentInAllocation"]] = relationship(
        back_populates="payment_in", cascade="all, delete-orphan"
    )


class PaymentInAllocation(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "payment_in_allocations"

    payment_in_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payments_in.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sales_invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_invoices.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)

    payment_in: Mapped["PaymentIn"] = relationship(back_populates="allocations")


class SalesReturn(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sales_returns"
    __table_args__ = (
        UniqueConstraint("tenant_id", "return_number", name="uq_sales_returns_tenant_return_number"),
    )

    return_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    sales_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sales_invoices.id", ondelete="SET NULL"), nullable=True
    )
    return_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_in: Mapped[date | None] = mapped_column(Date, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    additional_charges: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tds_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tcs_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    round_off: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    status: Mapped[SalesReturnStatus] = mapped_column(
        Enum(SalesReturnStatus, name="sales_return_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=SalesReturnStatus.COMPLETED,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authorized_signatory_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    authorized_signatory_signature_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["SalesReturnItem"]] = relationship(back_populates="sales_return", cascade="all, delete-orphan")


class SalesReturnItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "sales_return_items"

    sales_return_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sales_returns.id", ondelete="CASCADE"), nullable=False
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

    sales_return: Mapped["SalesReturn"] = relationship(back_populates="items")


class CreditNote(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "credit_notes"
    __table_args__ = (
        UniqueConstraint("tenant_id", "credit_note_number", name="uq_credit_notes_tenant_credit_note_number"),
    )

    credit_note_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    sales_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sales_invoices.id", ondelete="SET NULL"), nullable=True
    )
    sales_return_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sales_returns.id", ondelete="SET NULL"), nullable=True
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
    status: Mapped[CreditNoteStatus] = mapped_column(
        Enum(CreditNoteStatus, name="credit_note_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=CreditNoteStatus.COMPLETED,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_terms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    authorized_signatory_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    authorized_signatory_signature_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)

    items: Mapped[list["CreditNoteItem"]] = relationship(back_populates="credit_note", cascade="all, delete-orphan")


class CreditNoteItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "credit_note_items"

    credit_note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False
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

    credit_note: Mapped["CreditNote"] = relationship(back_populates="items")


class DeliveryChallan(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "delivery_challans"
    __table_args__ = (
        UniqueConstraint("tenant_id", "challan_number", name="uq_delivery_challans_tenant_challan_number"),
    )

    challan_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True
    )
    sales_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sales_invoices.id", ondelete="SET NULL"), nullable=True
    )
    challan_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[DeliveryChallanStatus] = mapped_column(
        Enum(DeliveryChallanStatus, name="delivery_challan_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=DeliveryChallanStatus.DRAFT,
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

    items: Mapped[list["DeliveryChallanItem"]] = relationship(
        back_populates="delivery_challan", cascade="all, delete-orphan"
    )


class DeliveryChallanItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "delivery_challan_items"

    delivery_challan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("delivery_challans.id", ondelete="CASCADE"), nullable=False
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

    delivery_challan: Mapped["DeliveryChallan"] = relationship(back_populates="items")


class ProformaInvoice(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "proforma_invoices"
    __table_args__ = (
        UniqueConstraint("tenant_id", "proforma_number", name="uq_proforma_invoices_tenant_proforma_number"),
    )

    proforma_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    quotation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True
    )
    proforma_date: Mapped[date] = mapped_column(Date, nullable=False)
    valid_till: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[ProformaInvoiceStatus] = mapped_column(
        Enum(ProformaInvoiceStatus, name="proforma_invoice_status", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=ProformaInvoiceStatus.DRAFT,
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

    items: Mapped[list["ProformaInvoiceItem"]] = relationship(
        back_populates="proforma_invoice", cascade="all, delete-orphan"
    )


class ProformaInvoiceItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "proforma_invoice_items"

    proforma_invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("proforma_invoices.id", ondelete="CASCADE"), nullable=False
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

    proforma_invoice: Mapped["ProformaInvoice"] = relationship(back_populates="items")
