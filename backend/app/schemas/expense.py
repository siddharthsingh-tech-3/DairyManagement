import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseItemInput(BaseModel):
    description: str = Field(min_length=1, max_length=150)
    amount: Decimal = Field(gt=0)
    tax_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100)


class ExpenseItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    amount: Decimal
    tax_percent: Decimal


class ExpenseCreateRequest(BaseModel):
    expense_number: str | None = None
    category: str = Field(min_length=1, max_length=50)
    expense_date: date
    payee: str | None = None
    payment_mode: str | None = None
    original_invoice_number: str | None = None
    is_gst_applicable: bool = False
    is_paid: bool = True
    note: str | None = None
    items: list[ExpenseItemInput] = Field(min_length=1)


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    expense_number: str | None
    category: str
    amount: Decimal
    expense_date: date
    payee: str | None
    payment_mode: str | None
    original_invoice_number: str | None
    is_gst_applicable: bool
    is_paid: bool
    note: str | None
    attachment_url: str | None
    items: list[ExpenseItemResponse]
    created_at: datetime
