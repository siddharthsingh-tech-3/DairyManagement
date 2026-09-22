import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
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


class BusinessPartner(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "business_partners"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    tin: Mapped[str | None] = mapped_column(String(30), nullable=True)
    pan_number: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    other_tax_details: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[PartnerStatus] = mapped_column(
        Enum(PartnerStatus, name="partner_status", values_callable=lambda e: [m.value for m in e]),
        default=PartnerStatus.ACTIVE,
        nullable=False,
    )

    opening_capital_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    opening_balance_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    bank_accounts: Mapped[list["PartnerBankAccount"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerBankAccount.is_primary)"
    )
    capital_contributions: Mapped[list["PartnerCapitalContribution"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerCapitalContribution.contribution_date)"
    )
    profit_loss_ratios: Mapped[list["PartnerProfitLossRatio"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerProfitLossRatio.effective_date)"
    )
    drawings: Mapped[list["PartnerDrawing"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerDrawing.drawing_date)"
    )
    profit_loss_allocations: Mapped[list["PartnerProfitLossAllocation"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerProfitLossAllocation.allocation_date)"
    )
    remunerations: Mapped[list["PartnerRemuneration"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerRemuneration.effective_date)"
    )
    capital_interest_entries: Mapped[list["PartnerCapitalInterest"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerCapitalInterest.effective_date)"
    )
    loans: Mapped[list["PartnerLoan"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerLoan.loan_date)"
    )
    joint_liabilities: Mapped[list["PartnerJointLiability"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerJointLiability.created_at)"
    )
    responsibilities: Mapped[list["PartnerResponsibility"]] = relationship(
        back_populates="partner", cascade="all, delete-orphan", order_by="desc(PartnerResponsibility.effective_date)"
    )


class PartnerBankAccount(Base, UUIDPrimaryKeyMixin, TenantMixin):
    """Payout account for a partner. Only the account number is mandatory — the rest
    are recommended-but-optional so an account can be captured before the full details
    are on hand."""

    __tablename__ = "partner_bank_accounts"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    account_number: Mapped[str] = mapped_column(String(30), nullable=False)
    account_holder_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    ifsc_code: Mapped[str | None] = mapped_column(String(11), nullable=True)
    branch_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="bank_accounts")


class PartnerCapitalContribution(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_capital_contributions"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    contribution_type: Mapped[CapitalContributionType] = mapped_column(
        Enum(CapitalContributionType, name="capital_contribution_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    contribution_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Interest the partner expects in return for this contribution. All nullable: a
    # contribution may carry no interest expectation at all, and a partner may state
    # either a rate, a fixed amount, or both.
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    interest_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    interest_calculation_method: Mapped[InterestCalculationMethod | None] = mapped_column(
        Enum(InterestCalculationMethod, name="interest_calculation_method", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    interest_effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="capital_contributions")


class PartnerProfitLossRatio(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_profit_loss_ratios"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    profit_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    loss_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="profit_loss_ratios")


class PartnerDrawing(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_drawings"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    drawing_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="drawings")


class PartnerProfitLossAllocation(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_profit_loss_allocations"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    allocation_date: Mapped[date] = mapped_column(Date, nullable=False)
    period_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="profit_loss_allocations")


class PartnerRemuneration(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_remunerations"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    remuneration_type: Mapped[RemunerationType] = mapped_column(
        Enum(RemunerationType, name="remuneration_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    frequency: Mapped[RemunerationFrequency] = mapped_column(
        Enum(RemunerationFrequency, name="remuneration_frequency", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="remunerations")


class PartnerCapitalInterest(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_capital_interest"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    interest_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    calculation_method: Mapped[InterestCalculationMethod] = mapped_column(
        Enum(InterestCalculationMethod, name="interest_calculation_method", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    interest_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_status: Mapped[InterestPaymentStatus] = mapped_column(
        Enum(InterestPaymentStatus, name="interest_payment_status", values_callable=lambda e: [m.value for m in e]),
        default=InterestPaymentStatus.PENDING,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="capital_interest_entries")


class PartnerLoan(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_loans"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    loan_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    loan_date: Mapped[date] = mapped_column(Date, nullable=False)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    repayment_terms: Mapped[str | None] = mapped_column(String(255), nullable=True)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    loan_status: Mapped[LoanStatus] = mapped_column(
        Enum(LoanStatus, name="loan_status", values_callable=lambda e: [m.value for m in e]),
        default=LoanStatus.ACTIVE,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="loans")


class PartnerJointLiability(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_joint_liabilities"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    liability_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_liability_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    share_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    outstanding_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[LiabilityStatus] = mapped_column(
        Enum(LiabilityStatus, name="liability_status", values_callable=lambda e: [m.value for m in e]),
        default=LiabilityStatus.PENDING,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="joint_liabilities")


class PartnerResponsibility(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "partner_responsibilities"

    partner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("business_partners.id", ondelete="CASCADE"), nullable=False)
    role_title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    financial_decision_authority: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approval_authority: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    partner: Mapped["BusinessPartner"] = relationship(back_populates="responsibilities")
