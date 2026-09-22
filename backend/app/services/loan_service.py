import calendar
import uuid
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.business_partner import BusinessPartner
from app.models.enums import (
    InstallmentStatus,
    InterestCalculationMethod,
    LoanLedgerEntryType,
    LoanPartyType,
    LoanRecordStatus,
    LoanType,
    RepaymentFrequency,
)
from app.models.loan import Loan, LoanLedgerEntry, LoanRepayment, LoanRepaymentInstallment
from app.models.vendor import Vendor
from app.repositories.loan_repository import LoanRepository
from app.schemas.loan import LoanCreateRequest, LoanRepaymentInput, LoanUpdateRequest
from app.services.audit_service import AuditService

TWO_PLACES = Decimal("0.01")
_MONTHS_PER_PERIOD = {
    RepaymentFrequency.MONTHLY: 1,
    RepaymentFrequency.QUARTERLY: 3,
    RepaymentFrequency.HALF_YEARLY: 6,
    RepaymentFrequency.YEARLY: 12,
}


def _round(value: Decimal) -> Decimal:
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _add_months(start: date, months: int) -> date:
    """Calendar-safe month arithmetic with end-of-month clamping (e.g. Jan 31 + 1 -> Feb 28/29)."""
    total_months = start.month - 1 + months
    year = start.year + total_months // 12
    month = total_months % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _recalc_installment_status(installment: LoanRepaymentInstallment, as_of: date) -> None:
    remaining = installment.total_installment_amount - installment.paid_amount
    if remaining <= 0:
        installment.status = InstallmentStatus.PAID
    elif installment.paid_amount > 0:
        installment.status = InstallmentStatus.PARTIALLY_PAID
    elif installment.due_date < as_of:
        installment.status = InstallmentStatus.OVERDUE
    elif installment.due_date == as_of:
        installment.status = InstallmentStatus.DUE
    else:
        installment.status = InstallmentStatus.UPCOMING


def generate_schedule(
    *,
    principal: Decimal,
    annual_rate: Decimal,
    tenure_months: int,
    frequency: RepaymentFrequency,
    first_repayment_date: date,
    method: InterestCalculationMethod,
    tax_rate: Decimal | None,
) -> tuple[list[dict], Decimal]:
    """Pure schedule-generation function — no DB access, directly unit-testable.

    Returns (installment_dicts, total_interest). Each dict has the fields needed to
    construct a LoanRepaymentInstallment (minus loan_id/status, added by the caller).
    """
    months_per_period = _MONTHS_PER_PERIOD[frequency]
    n = max(1, round(tenure_months / months_per_period))
    tax_rate = tax_rate or Decimal("0")

    rows: list[dict] = []
    opening = principal

    if method == InterestCalculationMethod.SIMPLE:
        total_interest = _round(principal * annual_rate / Decimal("100") * Decimal(tenure_months) / Decimal("12"))
        principal_per_period = _round(principal / n)
        interest_per_period = _round(total_interest / n)

        remaining_principal = principal
        remaining_interest = total_interest
        for i in range(1, n + 1):
            is_last = i == n
            principal_component = remaining_principal if is_last else principal_per_period
            interest_component = remaining_interest if is_last else interest_per_period
            tax_component = _round(interest_component * tax_rate / Decimal("100"))
            rows.append(
                {
                    "installment_number": i,
                    "due_date": _add_months(first_repayment_date, (i - 1) * months_per_period),
                    "opening_principal": opening,
                    "principal_component": principal_component,
                    "interest_component": interest_component,
                    "tax_component": tax_component,
                    "total_installment_amount": principal_component + interest_component,
                }
            )
            opening -= principal_component
            remaining_principal -= principal_component
            remaining_interest -= interest_component
    else:
        periods_per_year = Decimal("12") / Decimal(months_per_period)
        r = (annual_rate / Decimal("100")) / periods_per_year
        if r == 0:
            emi = _round(principal / n)
        else:
            factor = (1 + r) ** n
            emi = _round(principal * r * factor / (factor - 1))

        total_interest = Decimal("0")
        remaining_principal = principal
        for i in range(1, n + 1):
            is_last = i == n
            interest_component = _round(remaining_principal * r)
            principal_component = remaining_principal if is_last else _round(emi - interest_component)
            tax_component = _round(interest_component * tax_rate / Decimal("100"))
            rows.append(
                {
                    "installment_number": i,
                    "due_date": _add_months(first_repayment_date, (i - 1) * months_per_period),
                    "opening_principal": opening,
                    "principal_component": principal_component,
                    "interest_component": interest_component,
                    "tax_component": tax_component,
                    "total_installment_amount": principal_component + interest_component,
                }
            )
            opening -= principal_component
            remaining_principal -= principal_component
            total_interest += interest_component

    return rows, total_interest


_PRINCIPAL_ENTRY_TYPES = {
    LoanLedgerEntryType.DISBURSEMENT,
    LoanLedgerEntryType.PRINCIPAL_REPAYMENT,
    LoanLedgerEntryType.ADJUSTMENT,
    LoanLedgerEntryType.CANCELLATION,
}


class LoanService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = LoanRepository(db)
        self.audit = AuditService(db)

    async def list_loans(
        self,
        loan_type: LoanType | None = None,
        status: LoanRecordStatus | None = None,
        party_type: LoanPartyType | None = None,
        party_id: uuid.UUID | None = None,
        search: str | None = None,
    ) -> list[Loan]:
        return await self.repo.search(loan_type, status, party_type, party_id, search)

    async def get_loan(self, loan_id: uuid.UUID) -> Loan:
        loan = await self.repo.get_by_id(loan_id)
        if loan is None:
            raise NotFoundError("Loan not found")
        return loan

    async def get_loan_detail(self, loan_id: uuid.UUID) -> Loan:
        loan = await self.repo.get_with_children(loan_id)
        if loan is None:
            raise NotFoundError("Loan not found")
        return loan

    async def _resolve_party_name(self, data: LoanCreateRequest) -> str:
        if data.party_type == LoanPartyType.VENDOR:
            vendor = await self.db.get(Vendor, data.party_id)
            if vendor is None:
                raise NotFoundError("Vendor not found")
            return vendor.name
        if data.party_type == LoanPartyType.BUSINESS_PARTNER:
            partner = await self.db.get(BusinessPartner, data.party_id)
            if partner is None:
                raise NotFoundError("Business partner not found")
            return partner.name
        return (data.party_name or "").strip()

    async def create_loan(self, data: LoanCreateRequest, actor_name: str, actor_id: uuid.UUID | None) -> Loan:
        party_name = await self._resolve_party_name(data)
        maturity_date = _add_months(data.loan_date, data.tenure_months)

        schedule_rows, total_interest = generate_schedule(
            principal=data.principal_amount,
            annual_rate=data.interest_rate,
            tenure_months=data.tenure_months,
            frequency=data.repayment_frequency,
            first_repayment_date=data.first_repayment_date,
            method=data.interest_type,
            tax_rate=data.tax_rate,
        )

        loan = Loan(
            loan_number=await self.repo.next_document_number("loan"),
            loan_type=data.loan_type,
            party_type=data.party_type,
            party_id=data.party_id,
            party_name=party_name,
            principal_amount=data.principal_amount,
            loan_date=data.loan_date,
            disbursement_method=data.disbursement_method,
            interest_rate=data.interest_rate,
            interest_type=data.interest_type,
            tenure_months=data.tenure_months,
            repayment_frequency=data.repayment_frequency,
            first_repayment_date=data.first_repayment_date,
            maturity_date=maturity_date,
            tax_type=data.tax_type,
            tax_rate=data.tax_rate,
            outstanding_principal=Decimal("0"),
            # The full scheduled interest is an outstanding obligation from day one,
            # same as principal — there's no separate accrual step in this model.
            outstanding_interest=total_interest,
            total_interest=total_interest,
            paid_amount=Decimal("0"),
            notes=data.notes,
            created_by=actor_id,
        )
        self.repo.add(loan)
        await self.db.flush()

        installments = [
            LoanRepaymentInstallment(loan_id=loan.id, **row, status=InstallmentStatus.UPCOMING)
            for row in schedule_rows
        ]
        self.repo.add_installments(installments)

        verb = "received from" if data.loan_type == LoanType.TAKEN else "disbursed to"
        self.post_ledger_entry(
            loan,
            LoanLedgerEntryType.DISBURSEMENT,
            f"Loan {verb} {party_name}",
            debit=data.principal_amount,
            reference_type="loan",
            reference_id=loan.id,
            created_by=actor_id,
        )

        self.audit.log(actor_name, f"recorded a loan {data.loan_type.value} with {party_name}", entity_type="loan", entity_id=loan.id)
        await self.db.commit()
        return await self.get_loan_detail(loan.id)

    async def update_loan(self, loan_id: uuid.UUID, data: LoanUpdateRequest, actor_name: str) -> Loan:
        loan = await self.get_loan(loan_id)
        if data.notes is not None:
            loan.notes = data.notes
        if data.tax_type is not None:
            loan.tax_type = data.tax_type
        if data.tax_rate is not None:
            loan.tax_rate = data.tax_rate
        if data.status is not None:
            loan.status = data.status
        self.audit.log(actor_name, f"updated loan {loan.loan_number}", entity_type="loan", entity_id=loan.id)
        await self.db.commit()
        await self.db.refresh(loan)
        return loan

    async def cancel_loan(self, loan_id: uuid.UUID, actor_name: str, actor_id: uuid.UUID | None) -> Loan:
        loan = await self.get_loan(loan_id)
        if loan.paid_amount > 0:
            raise BusinessRuleError("Cannot cancel a loan with recorded repayments")
        self.post_ledger_entry(
            loan,
            LoanLedgerEntryType.CANCELLATION,
            f"Loan {loan.loan_number} cancelled",
            credit=loan.outstanding_principal,
            reference_type="loan",
            reference_id=loan.id,
            created_by=actor_id,
        )
        loan.outstanding_interest = Decimal("0")
        loan.status = LoanRecordStatus.CANCELLED
        self.audit.log(actor_name, f"cancelled loan {loan.loan_number}", entity_type="loan", entity_id=loan.id)
        await self.db.commit()
        await self.db.refresh(loan)
        return loan

    async def delete_loan(self, loan_id: uuid.UUID, actor_name: str) -> None:
        loan = await self.get_loan(loan_id)
        repayments = await self.repo.get_repayments_for_loan(loan_id)
        if repayments:
            raise BusinessRuleError("Cancel or reconcile repayments before deleting this loan")
        await self.repo.delete(loan)
        self.audit.log(actor_name, f"deleted loan {loan.loan_number}", entity_type="loan", entity_id=loan_id)
        await self.db.commit()

    async def get_schedule(self, loan_id: uuid.UUID) -> list[LoanRepaymentInstallment]:
        await self.get_loan(loan_id)
        return await self.repo.get_installments_for_loan(loan_id)

    async def get_repayments(self, loan_id: uuid.UUID) -> list[LoanRepayment]:
        await self.get_loan(loan_id)
        return await self.repo.get_repayments_for_loan(loan_id)

    async def get_ledger_entries(self, loan_id: uuid.UUID) -> list[LoanLedgerEntry]:
        await self.get_loan(loan_id)
        return await self.repo.get_ledger_entries_for_loan(loan_id)

    async def record_repayment(
        self, loan_id: uuid.UUID, data: LoanRepaymentInput, actor_name: str, actor_id: uuid.UUID | None
    ) -> LoanRepayment:
        loan = await self.get_loan(loan_id)

        if data.principal_amount > loan.outstanding_principal:
            raise BusinessRuleError("Principal payment exceeds outstanding principal")
        if data.interest_amount + data.tax_amount > loan.outstanding_interest:
            raise BusinessRuleError("Interest/tax payment exceeds outstanding interest")

        repayment = LoanRepayment(
            loan_id=loan.id,
            installment_id=data.installment_id,
            payment_date=data.payment_date,
            method=data.method,
            principal_amount=data.principal_amount,
            interest_amount=data.interest_amount,
            tax_amount=data.tax_amount,
            tax_deduction_date=data.tax_deduction_date,
            tax_reference=data.tax_reference,
            reference=data.reference,
            notes=data.notes,
            created_by=actor_id,
        )
        self.repo.add_repayment(repayment)
        await self.db.flush()  # populate repayment.id before it's used as ledger reference_id below

        total = data.principal_amount + data.interest_amount + data.tax_amount
        await self._apply_to_installments(loan, data.installment_id, total, data.payment_date)

        if data.principal_amount > 0:
            self.post_ledger_entry(
                loan,
                LoanLedgerEntryType.PRINCIPAL_REPAYMENT,
                f"Principal repayment for loan {loan.loan_number}",
                credit=data.principal_amount,
                reference_type="loan_repayment",
                reference_id=repayment.id,
                created_by=actor_id,
            )
        if data.interest_amount > 0:
            self.post_ledger_entry(
                loan,
                LoanLedgerEntryType.INTEREST_REPAYMENT,
                f"Interest repayment for loan {loan.loan_number}",
                credit=data.interest_amount,
                reference_type="loan_repayment",
                reference_id=repayment.id,
                created_by=actor_id,
            )
        if data.tax_amount > 0:
            self.post_ledger_entry(
                loan,
                LoanLedgerEntryType.TAX_DEDUCTION,
                f"Tax/TDS deducted on loan {loan.loan_number}",
                credit=data.tax_amount,
                reference_type="loan_repayment",
                reference_id=repayment.id,
                created_by=actor_id,
            )

        loan.paid_amount = loan.paid_amount + total
        if loan.outstanding_principal <= 0 and loan.status == LoanRecordStatus.ACTIVE:
            loan.status = LoanRecordStatus.CLOSED

        self.audit.log(actor_name, f"recorded a repayment for loan {loan.loan_number}", entity_type="loan", entity_id=loan.id)
        await self.db.commit()
        await self.db.refresh(repayment)
        return repayment

    async def _apply_to_installments(
        self, loan: Loan, installment_id: uuid.UUID | None, total: Decimal, as_of: date
    ) -> None:
        if installment_id is not None:
            installment = await self.repo.get_installment(installment_id)
            if installment is None or installment.loan_id != loan.id:
                raise NotFoundError("Installment not found")
            if installment.status == InstallmentStatus.PAID:
                raise BusinessRuleError("This installment is already fully paid")
            installment.paid_amount = installment.paid_amount + total
            _recalc_installment_status(installment, as_of)
            return

        remaining = total
        installments = await self.repo.get_installments_for_loan(loan.id)
        for installment in installments:
            if remaining <= 0:
                break
            if installment.status == InstallmentStatus.PAID:
                continue
            due = installment.total_installment_amount - installment.paid_amount
            if due <= 0:
                continue
            applied = min(due, remaining)
            installment.paid_amount = installment.paid_amount + applied
            _recalc_installment_status(installment, as_of)
            remaining -= applied

    def post_ledger_entry(
        self,
        loan: Loan,
        entry_type: LoanLedgerEntryType,
        description: str,
        *,
        debit: Decimal = Decimal("0"),
        credit: Decimal = Decimal("0"),
        reference_type: str | None = None,
        reference_id: uuid.UUID | None = None,
        created_by: uuid.UUID | None = None,
    ) -> LoanLedgerEntry:
        entry = LoanLedgerEntry(
            loan_id=loan.id,
            entry_type=entry_type,
            description=description,
            debit=debit,
            credit=credit,
            reference_type=reference_type,
            reference_id=reference_id,
            created_by=created_by,
        )
        self.repo.add_ledger_entry(entry)
        if entry_type in _PRINCIPAL_ENTRY_TYPES:
            loan.outstanding_principal = loan.outstanding_principal + debit - credit
        else:
            loan.outstanding_interest = loan.outstanding_interest + debit - credit
        return entry
