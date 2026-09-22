import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    DebitNoteStatus,
    PaymentMethod,
    PurchaseInvoiceStatus,
    PurchaseOrderStatus,
    PurchaseReturnStatus,
)

# Shared by Purchase Order and Purchase Invoice line items (support a discount%).
class PurchaseItemRequest(BaseModel):
    product_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=150)
    hsn_code: str = ""
    quantity: int = Field(gt=0)
    rate: Decimal = Field(ge=0)
    discount_percent: Decimal = Decimal("0")
    tax_percent: Decimal = Decimal("0")


class PurchaseItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID | None
    description: str
    hsn_code: str
    quantity: int
    rate: Decimal
    discount_percent: Decimal
    tax_percent: Decimal
    amount: Decimal


# Shared by Purchase Return and Debit Note line items (no discount%).
class PurchaseAdjustmentItemRequest(BaseModel):
    product_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=150)
    hsn_code: str = ""
    quantity: int = Field(gt=0)
    rate: Decimal = Field(ge=0)
    tax_percent: Decimal = Decimal("0")


class PurchaseAdjustmentItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID | None
    description: str
    hsn_code: str
    quantity: int
    rate: Decimal
    tax_percent: Decimal
    amount: Decimal


class PurchaseOrderCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    po_number: str | None = Field(default=None, max_length=30)
    order_date: date
    valid_till: date | None = None
    payment_terms: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    terms_and_conditions: str | None = Field(default=None, max_length=1000)
    discount_amount: Decimal = Decimal("0")
    additional_charges: Decimal = Decimal("0")
    tds_amount: Decimal = Decimal("0")
    tcs_amount: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    amount_paid: Decimal = Decimal("0")
    authorized_signatory_name: str | None = Field(default=None, max_length=150)
    authorized_signatory_signature_url: str | None = Field(default=None, max_length=300)
    items: list[PurchaseItemRequest] = Field(min_length=1)


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    po_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    order_date: date
    valid_till: date | None
    status: PurchaseOrderStatus
    subtotal: Decimal
    discount_amount: Decimal
    additional_charges: Decimal
    tax_amount: Decimal
    tds_amount: Decimal
    tcs_amount: Decimal
    round_off: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    payment_terms: str | None
    terms_and_conditions: str | None
    authorized_signatory_name: str | None
    authorized_signatory_signature_url: str | None
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[PurchaseItemResponse]


class PurchaseInvoiceCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    purchase_order_id: uuid.UUID | None = None
    invoice_number: str | None = Field(default=None, max_length=30)
    vendor_invoice_number: str | None = None
    invoice_date: date
    due_date: date | None = None
    payment_terms: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    terms_and_conditions: str | None = Field(default=None, max_length=1000)
    discount_amount: Decimal = Decimal("0")
    additional_charges: Decimal = Decimal("0")
    tds_amount: Decimal = Decimal("0")
    tcs_amount: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    amount_paid: Decimal = Decimal("0")
    authorized_signatory_name: str | None = Field(default=None, max_length=150)
    authorized_signatory_signature_url: str | None = Field(default=None, max_length=300)
    items: list[PurchaseItemRequest] = Field(min_length=1)


class PurchaseInvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    vendor_invoice_number: str | None
    vendor_id: uuid.UUID
    vendor_name: str
    purchase_order_id: uuid.UUID | None
    invoice_date: date
    due_date: date | None
    subtotal: Decimal
    discount_amount: Decimal
    additional_charges: Decimal
    tax_amount: Decimal
    tds_amount: Decimal
    tcs_amount: Decimal
    round_off: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    payment_terms: str | None
    terms_and_conditions: str | None
    authorized_signatory_name: str | None
    authorized_signatory_signature_url: str | None
    status: PurchaseInvoiceStatus
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[PurchaseItemResponse]


class PaymentOutAllocationRequest(BaseModel):
    purchase_invoice_id: uuid.UUID
    amount: Decimal = Field(ge=0)
    discount: Decimal = Decimal("0")


class PaymentOutAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    purchase_invoice_id: uuid.UUID
    invoice_number: str
    amount: Decimal
    discount: Decimal


class PaymentOutCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    payment_number: str | None = Field(default=None, max_length=30)
    amount: Decimal = Field(gt=0)
    discount_amount: Decimal = Decimal("0")
    payment_date: date
    method: PaymentMethod
    reference: str | None = None
    notes: str | None = None
    allocations: list[PaymentOutAllocationRequest] = Field(default_factory=list)


class PaymentOutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    purchase_invoice_id: uuid.UUID | None
    amount: Decimal
    discount_amount: Decimal
    payment_date: date
    method: PaymentMethod
    reference: str | None
    notes: str | None
    created_at: datetime
    allocations: list[PaymentOutAllocationResponse]


class PurchaseReturnCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    purchase_invoice_id: uuid.UUID | None = None
    return_number: str | None = Field(default=None, max_length=30)
    return_date: date
    due_in: date | None = None
    payment_terms: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    terms_and_conditions: str | None = Field(default=None, max_length=1000)
    discount_amount: Decimal = Decimal("0")
    additional_charges: Decimal = Decimal("0")
    tds_amount: Decimal = Decimal("0")
    tcs_amount: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    amount_paid: Decimal = Decimal("0")
    authorized_signatory_name: str | None = Field(default=None, max_length=150)
    authorized_signatory_signature_url: str | None = Field(default=None, max_length=300)
    items: list[PurchaseAdjustmentItemRequest] = Field(min_length=1)


class PurchaseReturnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    return_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    purchase_invoice_id: uuid.UUID | None
    return_date: date
    due_in: date | None
    subtotal: Decimal
    discount_amount: Decimal
    additional_charges: Decimal
    tax_amount: Decimal
    tds_amount: Decimal
    tcs_amount: Decimal
    round_off: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    payment_terms: str | None
    terms_and_conditions: str | None
    authorized_signatory_name: str | None
    authorized_signatory_signature_url: str | None
    status: PurchaseReturnStatus
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[PurchaseAdjustmentItemResponse]


class DebitNoteCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    purchase_invoice_id: uuid.UUID | None = None
    purchase_return_id: uuid.UUID | None = None
    debit_note_number: str | None = Field(default=None, max_length=30)
    note_date: date
    payment_terms: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    terms_and_conditions: str | None = Field(default=None, max_length=1000)
    discount_amount: Decimal = Decimal("0")
    additional_charges: Decimal = Decimal("0")
    tds_amount: Decimal = Decimal("0")
    tcs_amount: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    amount_paid: Decimal = Decimal("0")
    authorized_signatory_name: str | None = Field(default=None, max_length=150)
    authorized_signatory_signature_url: str | None = Field(default=None, max_length=300)
    items: list[PurchaseAdjustmentItemRequest] = Field(min_length=1)


class DebitNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    debit_note_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    purchase_invoice_id: uuid.UUID | None
    purchase_return_id: uuid.UUID | None
    note_date: date
    subtotal: Decimal
    discount_amount: Decimal
    additional_charges: Decimal
    tax_amount: Decimal
    tds_amount: Decimal
    tcs_amount: Decimal
    round_off: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    payment_terms: str | None
    terms_and_conditions: str | None
    authorized_signatory_name: str | None
    authorized_signatory_signature_url: str | None
    status: DebitNoteStatus
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[PurchaseAdjustmentItemResponse]
