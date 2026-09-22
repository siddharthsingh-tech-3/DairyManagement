import uuid
from datetime import date
from decimal import Decimal
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import (
    CapitalContributionType,
    InterestCalculationMethod,
    InterestPaymentStatus,
    LiabilityStatus,
    LoanStatus,
    PartnerStatus,
    RemunerationFrequency,
    RemunerationType,
)


class BankAccountInput(BaseModel):
    account_number: str = Field(min_length=4, max_length=30)
    account_holder_name: str | None = Field(default=None, max_length=150)
    bank_name: str | None = Field(default=None, max_length=150)
    ifsc_code: str | None = Field(default=None, min_length=11, max_length=11)
    branch_name: str | None = Field(default=None, max_length=150)
    is_primary: bool = False

    @field_validator("account_holder_name", "bank_name", "ifsc_code", "branch_name", mode="before")
    @classmethod
    def _blank_to_none(cls, value: str | None) -> str | None:
        """The partner form submits empty strings for untouched optional fields;
        treat those as "not provided" rather than failing the length checks."""
        if isinstance(value, str) and not value.strip():
            return None
        return value


class BankAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    account_number: str
    account_holder_name: str | None
    bank_name: str | None
    ifsc_code: str | None
    branch_name: str | None
    is_primary: bool


class BusinessPartnerCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    address: str = Field(min_length=1, max_length=500)
    phone: str | None = None
    email: str | None = None
    tin: str | None = None
    pan_number: str | None = None
    gstin: str | None = None
    other_tax_details: str | None = None
    opening_capital_balance: Decimal = Field(default=Decimal("0"), ge=0)
    opening_balance_date: date | None = None
    # At least one payout account is mandatory when a partner is added.
    bank_accounts: list[BankAccountInput] = Field(min_length=1)


class BusinessPartnerUpdateRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    tin: str | None = None
    pan_number: str | None = None
    gstin: str | None = None
    other_tax_details: str | None = None
    opening_capital_balance: Decimal | None = None
    opening_balance_date: date | None = None
    status: PartnerStatus | None = None


class CapitalContributionInput(BaseModel):
    contribution_type: CapitalContributionType
    amount: Decimal = Field(gt=0)
    contribution_date: date
    note: str | None = None

    interest_rate: Decimal | None = Field(default=None, ge=0, le=100)
    interest_amount: Decimal | None = Field(default=None, ge=0)
    interest_calculation_method: InterestCalculationMethod | None = None
    interest_effective_date: date | None = None

    @model_validator(mode="after")
    def _check_interest(self) -> Self:
        """A partner states the interest they expect as a rate, a fixed amount, or both.
        Method and effective date only make sense alongside one of those."""
        has_terms = self.interest_rate is not None or self.interest_amount is not None
        if not has_terms and (self.interest_calculation_method is not None or self.interest_effective_date is not None):
            raise ValueError("Provide an interest rate or interest amount along with the interest details")
        if has_terms and self.interest_effective_date is None:
            self.interest_effective_date = self.contribution_date
        return self


class CapitalContributionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contribution_type: CapitalContributionType
    amount: Decimal
    contribution_date: date
    note: str | None
    interest_rate: Decimal | None
    interest_amount: Decimal | None
    interest_calculation_method: InterestCalculationMethod | None
    interest_effective_date: date | None


class ProfitLossRatioInput(BaseModel):
    profit_percentage: Decimal = Field(ge=0, le=100)
    loss_percentage: Decimal = Field(ge=0, le=100)
    effective_date: date
    note: str | None = None


class ProfitLossRatioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    profit_percentage: Decimal
    loss_percentage: Decimal
    effective_date: date
    note: str | None


class DrawingInput(BaseModel):
    amount: Decimal = Field(gt=0)
    drawing_date: date
    description: str | None = None


class DrawingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: Decimal
    drawing_date: date
    description: str | None


class ProfitLossAllocationInput(BaseModel):
    amount: Decimal
    allocation_date: date
    period_label: str | None = None
    note: str | None = None


class ProfitLossAllocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: Decimal
    allocation_date: date
    period_label: str | None
    note: str | None


class RemunerationInput(BaseModel):
    remuneration_type: RemunerationType
    amount: Decimal = Field(gt=0)
    frequency: RemunerationFrequency
    effective_date: date
    description: str | None = None


class RemunerationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    remuneration_type: RemunerationType
    amount: Decimal
    frequency: RemunerationFrequency
    effective_date: date
    description: str | None


class CapitalInterestInput(BaseModel):
    interest_rate: Decimal = Field(ge=0, le=100)
    calculation_method: InterestCalculationMethod
    effective_date: date
    interest_amount: Decimal = Field(ge=0)
    payment_status: InterestPaymentStatus = InterestPaymentStatus.PENDING


class CapitalInterestUpdateRequest(BaseModel):
    payment_status: InterestPaymentStatus


class CapitalInterestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    interest_rate: Decimal
    calculation_method: InterestCalculationMethod
    effective_date: date
    interest_amount: Decimal
    payment_status: InterestPaymentStatus


class LoanInput(BaseModel):
    loan_amount: Decimal = Field(gt=0)
    loan_date: date
    interest_rate: Decimal | None = Field(default=None, ge=0, le=100)
    repayment_terms: str | None = None
    loan_status: LoanStatus = LoanStatus.ACTIVE


class LoanUpdateRequest(BaseModel):
    outstanding_balance: Decimal | None = Field(default=None, ge=0)
    loan_status: LoanStatus | None = None


class LoanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    loan_amount: Decimal
    loan_date: date
    interest_rate: Decimal | None
    repayment_terms: str | None
    outstanding_balance: Decimal
    loan_status: LoanStatus


class JointLiabilityInput(BaseModel):
    liability_type: str = Field(min_length=1, max_length=100)
    description: str | None = None
    total_liability_amount: Decimal = Field(gt=0)
    share_percentage: Decimal = Field(ge=0, le=100)
    outstanding_amount: Decimal = Field(ge=0)
    due_date: date | None = None
    status: LiabilityStatus = LiabilityStatus.PENDING


class JointLiabilityUpdateRequest(BaseModel):
    outstanding_amount: Decimal | None = Field(default=None, ge=0)
    status: LiabilityStatus | None = None


class JointLiabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    liability_type: str
    description: str | None
    total_liability_amount: Decimal
    share_percentage: Decimal
    outstanding_amount: Decimal
    due_date: date | None
    status: LiabilityStatus


class ResponsibilityInput(BaseModel):
    role_title: str = Field(min_length=1, max_length=150)
    description: str | None = None
    financial_decision_authority: bool = False
    approval_authority: bool = False
    effective_date: date
    notes: str | None = None


class ResponsibilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role_title: str
    description: str | None
    financial_decision_authority: bool
    approval_authority: bool
    effective_date: date
    notes: str | None


class BusinessPartnerResponse(BaseModel):
    """List-row shape with computed summary fields."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    address: str
    phone: str | None
    email: str | None
    tin: str | None
    pan_number: str | None
    gstin: str | None
    other_tax_details: str | None
    status: PartnerStatus
    opening_capital_balance: Decimal
    opening_balance_date: date | None

    total_capital_contributed: Decimal
    total_additional_contributed: Decimal
    total_expected_interest: Decimal
    total_drawings: Decimal
    current_capital_balance: Decimal
    current_profit_percentage: Decimal | None
    current_loss_percentage: Decimal | None
    total_outstanding_loans: Decimal
    total_outstanding_liabilities: Decimal


class BusinessPartnerDetailResponse(BusinessPartnerResponse):
    bank_accounts: list[BankAccountResponse] = []
    capital_contributions: list[CapitalContributionResponse] = []
    profit_loss_ratios: list[ProfitLossRatioResponse] = []
    drawings: list[DrawingResponse] = []
    profit_loss_allocations: list[ProfitLossAllocationResponse] = []
    remunerations: list[RemunerationResponse] = []
    capital_interest_entries: list[CapitalInterestResponse] = []
    loans: list[LoanResponse] = []
    joint_liabilities: list[JointLiabilityResponse] = []
    responsibilities: list[ResponsibilityResponse] = []
