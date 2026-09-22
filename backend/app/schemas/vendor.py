import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import LedgerEntryType


class OpeningBalanceDirection(StrEnum):
    TO_COLLECT = "to_collect"
    TO_PAY = "to_pay"


class BankAccountInput(BaseModel):
    account_holder_name: str = Field(min_length=1, max_length=150)
    account_number: str = Field(min_length=4, max_length=30)
    ifsc_code: str = Field(min_length=11, max_length=11)
    bank_name: str = Field(min_length=1, max_length=150)
    is_primary: bool = False


class CustomFieldInput(BaseModel):
    field_name: str = Field(min_length=1, max_length=100)
    field_value: str = Field(min_length=1, max_length=500)


class VendorCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str | None = None
    contact_name: str = Field(min_length=1, max_length=150)
    phone: str = Field(min_length=6, max_length=20)
    email: EmailStr | None = None
    area: str = Field(min_length=1, max_length=100)
    route: str = Field(min_length=1, max_length=50)
    gstin: str | None = None
    pan_number: str | None = None
    billing_street: str | None = None
    billing_city: str | None = None
    billing_state: str | None = None
    billing_pincode: str | None = None
    shipping_street: str | None = None
    shipping_city: str | None = None
    shipping_state: str | None = None
    shipping_pincode: str | None = None
    credit_period_days: int = Field(default=0, ge=0)
    credit_limit: Decimal = Decimal("0")
    vendor_since: date | None = None
    opening_balance: Decimal = Field(default=Decimal("0"), ge=0)
    opening_balance_direction: OpeningBalanceDirection = OpeningBalanceDirection.TO_COLLECT
    bank_accounts: list[BankAccountInput] = Field(default_factory=list)
    custom_fields: list[CustomFieldInput] = Field(default_factory=list)
    is_supplier: bool = False


class VendorUpdateRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    area: str | None = None
    route: str | None = None
    gstin: str | None = None
    pan_number: str | None = None
    billing_street: str | None = None
    billing_city: str | None = None
    billing_state: str | None = None
    billing_pincode: str | None = None
    shipping_street: str | None = None
    shipping_city: str | None = None
    shipping_state: str | None = None
    shipping_pincode: str | None = None
    credit_period_days: int | None = Field(default=None, ge=0)
    credit_limit: Decimal | None = None
    is_active: bool | None = None
    is_supplier: bool | None = None


class BankAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_holder_name: str
    account_number: str
    ifsc_code: str
    bank_name: str
    is_primary: bool


class CustomFieldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    field_name: str
    field_value: str


class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    category: str | None
    contact_name: str
    phone: str
    email: str | None
    area: str
    route: str
    gstin: str | None
    pan_number: str | None
    billing_street: str | None
    billing_city: str | None
    billing_state: str | None
    billing_pincode: str | None
    shipping_street: str | None
    shipping_city: str | None
    shipping_state: str | None
    shipping_pincode: str | None
    credit_period_days: int
    credit_limit: Decimal
    outstanding_balance: Decimal
    crates_with_vendor: int
    vendor_since: date
    is_active: bool
    is_over_credit_limit: bool
    is_supplier: bool


class LedgerEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entry_type: LedgerEntryType
    description: str
    debit: Decimal
    credit: Decimal
    reference_number: str | None
    status: str | None
    tds_deducted_by_party: Decimal
    tds_deducted_by_self: Decimal
    created_at: datetime


class VendorDetailResponse(VendorResponse):
    # The ORM relationship is `Vendor.ledger_entries` — validation_alias maps it
    # to this field's shorter API name. (A prior mismatch here silently produced
    # an always-empty ledger via the field's [] default instead of erroring.)
    ledger: list[LedgerEntryResponse] = Field(default_factory=list, validation_alias="ledger_entries")
    bank_accounts: list[BankAccountResponse] = []
    custom_fields: list[CustomFieldResponse] = []


class BulkVendorRow(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str | None = None
    gstin: str | None = None
    shipping_street: str | None = None
    shipping_pincode: str | None = None
    shipping_city: str | None = None
    shipping_state: str | None = None
    billing_street: str | None = None
    billing_pincode: str | None = None
    billing_city: str | None = None
    billing_state: str | None = None
    opening_balance: Decimal = Field(default=Decimal("0"), ge=0)
    opening_balance_direction: OpeningBalanceDirection = OpeningBalanceDirection.TO_COLLECT
    credit_period_days: int = Field(default=0, ge=0)
    # Deliberately a plain str, not EmailStr: a bad value here should fail just
    # this row (see VendorService.bulk_create_vendors), not reject the whole
    # batch at the request-parsing stage the way EmailStr would.
    email: str | None = None


class BulkVendorCreateRequest(BaseModel):
    rows: list[BulkVendorRow] = Field(min_length=1, max_length=500)


class BulkVendorRowResult(BaseModel):
    row_index: int
    success: bool
    name: str
    vendor_id: uuid.UUID | None = None
    error: str | None = None


class BulkVendorCreateResponse(BaseModel):
    created_count: int
    failed_count: int
    results: list[BulkVendorRowResult]
