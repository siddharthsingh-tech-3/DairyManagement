import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
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


class Loan(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "loans"
    __table_args__ = (UniqueConstraint("tenant_id", "loan_number", name="uq_loans_tenant_loan_number"),)

    loan_number: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    loan_type: Mapped[LoanType] = mapped_column(
        Enum(LoanType, name="loan_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        index=True,
    )
    party_type: Mapped[LoanPartyType] = mapped_column(
        Enum(LoanPartyType, name="loan_party_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    party_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True, index=True)
    party_name: Mapped[str] = mapped_column(String(150), nullable=False)

    principal_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    loan_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    disbursement_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )

    interest_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    interest_type: Mapped[InterestCalculationMethod] = mapped_column(
        Enum(InterestCalculationMethod, name="interest_calculation_method", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    tenure_months: Mapped[int] = mapped_column(nullable=False)
    repayment_frequency: Mapped[RepaymentFrequency] = mapped_column(
        Enum(RepaymentFrequency, name="repayment_frequency", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    first_repayment_date: Mapped[date] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[date] = mapped_column(Date, nullable=False)

    tax_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)

    outstanding_principal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    outstanding_interest: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_interest: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)

    status: Mapped[LoanRecordStatus] = mapped_column(
        Enum(LoanRecordStatus, name="loan_record_status", values_callable=lambda e: [m.value for m in e]),
        default=LoanRecordStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    installments: Mapped[list["LoanRepaymentInstallment"]] = relationship(
        back_populates="loan", cascade="all, delete-orphan", order_by="LoanRepaymentInstallment.installment_number"
    )
    repayments: Mapped[list["LoanRepayment"]] = relationship(
        back_populates="loan", cascade="all, delete-orphan", order_by="desc(LoanRepayment.created_at)"
    )
    ledger_entries: Mapped[list["LoanLedgerEntry"]] = relationship(
        back_populates="loan", cascade="all, delete-orphan", order_by="desc(LoanLedgerEntry.created_at)"
    )


class LoanRepaymentInstallment(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "loan_repayment_installments"

    loan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_number: Mapped[int] = mapped_column(nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    opening_principal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    principal_component: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    interest_component: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_component: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    total_installment_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    status: Mapped[InstallmentStatus] = mapped_column(
        Enum(InstallmentStatus, name="installment_status", values_callable=lambda e: [m.value for m in e]),
        default=InstallmentStatus.UPCOMING,
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    loan: Mapped["Loan"] = relationship(back_populates="installments")

    @property
    def remaining_amount(self) -> Decimal:
        return self.total_installment_amount - self.paid_amount


class LoanRepayment(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "loan_repayments"

    loan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("loan_repayment_installments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    principal_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    interest_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    tax_deduction_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    tax_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    loan: Mapped["Loan"] = relationship(back_populates="repayments")

    @property
    def total_amount(self) -> Decimal:
        return self.principal_amount + self.interest_amount + self.tax_amount


class LoanLedgerEntry(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "loan_ledger_entries"

    loan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("loans.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_type: Mapped[LoanLedgerEntryType] = mapped_column(
        Enum(LoanLedgerEntryType, name="loan_ledger_entry_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    debit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    credit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    loan: Mapped["Loan"] = relationship(back_populates="ledger_entries")
