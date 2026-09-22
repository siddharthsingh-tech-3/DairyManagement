import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import (
    InstallmentStatus,
    InterestCalculationMethod,
    LoanLedgerEntryType,
    LoanPartyType,
    LoanRecordStatus,
    LoanType,
    PaymentMethod,
    RepaymentFrequency,
)


class LoanCreateRequest(BaseModel):
    loan_type: LoanType
    party_type: LoanPartyType
    party_id: uuid.UUID | None = None
    party_name: str | None = Field(default=None, max_length=150)
    principal_amount: Decimal = Field(gt=0)
    loan_date: date
    disbursement_method: PaymentMethod
    interest_rate: Decimal = Field(ge=0, le=100)
    interest_type: InterestCalculationMethod
    tenure_months: int = Field(gt=0)
    repayment_frequency: RepaymentFrequency
    first_repayment_date: date
    tax_type: str | None = Field(default=None, max_length=30)
    tax_rate: Decimal | None = Field(default=None, ge=0, le=100)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def check_party(self) -> "LoanCreateRequest":
        if self.party_type == LoanPartyType.OTHER:
            if not (self.party_name or "").strip():
                raise ValueError("party_name is required when party_type is 'other'")
        elif self.party_id is None:
            raise ValueError("party_id is required unless party_type is 'other'")
        if self.first_repayment_date < self.loan_date:
            raise ValueError("first_repayment_date cannot be before loan_date")
        return self


class LoanUpdateRequest(BaseModel):
    notes: str | None = None
    tax_type: str | None = None
    tax_rate: Decimal | None = Field(default=None, ge=0, le=100)
    status: LoanRecordStatus | None = None


class LoanRepaymentInput(BaseModel):
    installment_id: uuid.UUID | None = None
    payment_date: date
    method: PaymentMethod
    principal_amount: Decimal = Field(default=Decimal("0"), ge=0)
    interest_amount: Decimal = Field(default=Decimal("0"), ge=0)
    tax_amount: Decimal = Field(default=Decimal("0"), ge=0)
    tax_deduction_date: date | None = None
    tax_reference: str | None = Field(default=None, max_length=100)
    reference: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def check_amounts(self) -> "LoanRepaymentInput":
        if self.principal_amount + self.interest_amount + self.tax_amount <= 0:
            raise ValueError("At least one of principal_amount, interest_amount, tax_amount must be greater than 0")
        return self


class LoanScheduleInstallmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    installment_number: int
    due_date: date
    opening_principal: Decimal
    principal_component: Decimal
    interest_component: Decimal
    tax_component: Decimal
    total_installment_amount: Decimal
    paid_amount: Decimal
    remaining_amount: Decimal
    status: InstallmentStatus


class LoanRepaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    installment_id: uuid.UUID | None
    payment_date: date
    method: PaymentMethod
    principal_amount: Decimal
    interest_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    tax_deduction_date: date | None
    tax_reference: str | None
    reference: str | None
    notes: str | None
    created_at: datetime


class LoanLedgerEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    entry_type: LoanLedgerEntryType
    description: str
    debit: Decimal
    credit: Decimal
    reference_type: str | None
    reference_id: uuid.UUID | None
    created_at: datetime


class LoanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    loan_number: str
    loan_type: LoanType
    party_type: LoanPartyType
    party_id: uuid.UUID | None
    party_name: str
    principal_amount: Decimal
    loan_date: date
    disbursement_method: PaymentMethod
    interest_rate: Decimal
    interest_type: InterestCalculationMethod
    tenure_months: int
    repayment_frequency: RepaymentFrequency
    first_repayment_date: date
    maturity_date: date
    tax_type: str | None
    tax_rate: Decimal | None
    outstanding_principal: Decimal
    outstanding_interest: Decimal
    total_interest: Decimal
    paid_amount: Decimal
    status: LoanRecordStatus
    notes: str | None


class LoanDetailResponse(LoanResponse):
    installments: list[LoanScheduleInstallmentResponse] = []
    repayments: list[LoanRepaymentResponse] = []
    ledger_entries: list[LoanLedgerEntryResponse] = []
