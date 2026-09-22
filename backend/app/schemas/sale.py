import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    CreditNoteStatus,
    DeliveryChallanStatus,
    PaymentMethod,
    ProformaInvoiceStatus,
    QuotationStatus,
    SalesInvoiceStatus,
    SalesReturnStatus,
)


# Shared by Quotation, Sales Invoice, Delivery Challan and Proforma Invoice line items (has a discount%).
class SalesItemRequest(BaseModel):
    product_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=150)
    hsn_code: str = ""
    quantity: int = Field(gt=0)
    rate: Decimal = Field(ge=0)
    discount_percent: Decimal = Decimal("0")
    tax_percent: Decimal = Decimal("0")


class SalesItemResponse(BaseModel):
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


# Shared by Sales Return and Credit Note line items (no discount%).
class SalesAdjustmentItemRequest(BaseModel):
    product_id: uuid.UUID | None = None
    description: str = Field(min_length=1, max_length=150)
    hsn_code: str = ""
    quantity: int = Field(gt=0)
    rate: Decimal = Field(ge=0)
    tax_percent: Decimal = Decimal("0")


class SalesAdjustmentItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID | None
    description: str
    hsn_code: str
    quantity: int
    rate: Decimal
    tax_percent: Decimal
    amount: Decimal


class QuotationCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    quote_date: date
    valid_till: date | None = None
    notes: str | None = None
    discount_amount: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    items: list[SalesItemRequest] = Field(min_length=1)


class QuotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quote_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    quote_date: date
    valid_till: date | None
    status: QuotationStatus
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    round_off: Decimal
    total_amount: Decimal
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[SalesItemResponse]


class SalesInvoiceCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    quotation_id: uuid.UUID | None = None
    invoice_number: str | None = Field(default=None, max_length=30)
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
    items: list[SalesItemRequest] = Field(min_length=1)


class SalesInvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    quotation_id: uuid.UUID | None
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
    status: SalesInvoiceStatus
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[SalesItemResponse]


class PaymentInAllocationRequest(BaseModel):
    sales_invoice_id: uuid.UUID
    amount: Decimal = Field(ge=0)
    discount: Decimal = Decimal("0")


class PaymentInAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sales_invoice_id: uuid.UUID
    invoice_number: str
    amount: Decimal
    discount: Decimal


class PaymentInCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    payment_number: str | None = Field(default=None, max_length=30)
    amount: Decimal = Field(gt=0)
    discount_amount: Decimal = Decimal("0")
    payment_date: date
    method: PaymentMethod
    reference: str | None = None
    notes: str | None = None
    allocations: list[PaymentInAllocationRequest] = Field(default_factory=list)


class PaymentInResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    sales_invoice_id: uuid.UUID | None
    amount: Decimal
    discount_amount: Decimal
    payment_date: date
    method: PaymentMethod
    reference: str | None
    notes: str | None
    created_at: datetime
    allocations: list[PaymentInAllocationResponse]


class SalesReturnCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    sales_invoice_id: uuid.UUID | None = None
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
    items: list[SalesAdjustmentItemRequest] = Field(min_length=1)


class SalesReturnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    return_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    sales_invoice_id: uuid.UUID | None
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
    status: SalesReturnStatus
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[SalesAdjustmentItemResponse]


class CreditNoteCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    sales_invoice_id: uuid.UUID | None = None
    sales_return_id: uuid.UUID | None = None
    credit_note_number: str | None = Field(default=None, max_length=30)
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
    items: list[SalesAdjustmentItemRequest] = Field(min_length=1)


class CreditNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    credit_note_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    sales_invoice_id: uuid.UUID | None
    sales_return_id: uuid.UUID | None
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
    status: CreditNoteStatus
    notes: str | None
    created_at: datetime
    created_by: str | None
    items: list[SalesAdjustmentItemResponse]


class DeliveryChallanCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    quotation_id: uuid.UUID | None = None
    challan_number: str | None = Field(default=None, max_length=30)
    challan_date: date
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
    items: list[SalesItemRequest] = Field(min_length=1)


class DeliveryChallanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    challan_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    quotation_id: uuid.UUID | None
    sales_invoice_id: uuid.UUID | None
    challan_date: date
    status: DeliveryChallanStatus
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
    items: list[SalesItemResponse]


class ProformaInvoiceCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    quotation_id: uuid.UUID | None = None
    proforma_number: str | None = Field(default=None, max_length=30)
    proforma_date: date
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
    items: list[SalesItemRequest] = Field(min_length=1)


class ProformaInvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    proforma_number: str
    vendor_id: uuid.UUID
    vendor_name: str
    quotation_id: uuid.UUID | None
    proforma_date: date
    valid_till: date | None
    status: ProformaInvoiceStatus
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
    items: list[SalesItemResponse]
