import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import InvoiceStatus, PaymentMethod, PaymentStatus


class InvoiceGenerateRequest(BaseModel):
    vendor_id: uuid.UUID
    period_month: date


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    hsn_code: str
    rate: Decimal
    quantity: int
    amount: Decimal


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_no: str
    vendor_id: uuid.UUID
    vendor_name: str
    period_month: date
    subtotal: Decimal
    cgst: Decimal
    sgst: Decimal
    total: Decimal
    amount_paid: Decimal
    status: InvoiceStatus
    due_date: date
    created_at: datetime
    created_by: str | None
    invoice_type: str
    items: list[InvoiceItemResponse]


class PaymentCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    invoice_id: uuid.UUID | None = None
    order_id: uuid.UUID | None = None
    amount: Decimal = Field(gt=0)
    tds_amount: Decimal = Field(default=Decimal("0"), ge=0)
    method: PaymentMethod
    reference: str | None = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vendor_id: uuid.UUID
    invoice_id: uuid.UUID | None
    order_id: uuid.UUID | None
    amount: Decimal
    tds_amount: Decimal
    method: PaymentMethod
    status: PaymentStatus
    reference: str | None
    created_at: datetime
