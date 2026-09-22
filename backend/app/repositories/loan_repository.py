import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import LoanPartyType, LoanRecordStatus, LoanType
from app.models.loan import Loan, LoanLedgerEntry, LoanRepayment, LoanRepaymentInstallment
from app.repositories.document_numbering import DocumentNumberingMixin

_CHILD_RELATIONSHIPS = (
    selectinload(Loan.installments),
    selectinload(Loan.repayments),
    selectinload(Loan.ledger_entries),
)


class LoanRepository(DocumentNumberingMixin):
    DOCUMENT_DEFAULT_PREFIXES = {"loan": "LN-"}

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, loan_id: uuid.UUID) -> Loan | None:
        return await self.db.get(Loan, loan_id)

    async def get_with_children(self, loan_id: uuid.UUID) -> Loan | None:
        result = await self.db.execute(select(Loan).where(Loan.id == loan_id).options(*_CHILD_RELATIONSHIPS))
        return result.scalar_one_or_none()

    async def search(
        self,
        loan_type: LoanType | None = None,
        status: LoanRecordStatus | None = None,
        party_type: LoanPartyType | None = None,
        party_id: uuid.UUID | None = None,
        query: str | None = None,
    ) -> list[Loan]:
        stmt = select(Loan)
        if loan_type is not None:
            stmt = stmt.where(Loan.loan_type == loan_type)
        if status is not None:
            stmt = stmt.where(Loan.status == status)
        if party_type is not None:
            stmt = stmt.where(Loan.party_type == party_type)
        if party_id is not None:
            stmt = stmt.where(Loan.party_id == party_id)
        if query:
            like = f"%{query.lower()}%"
            stmt = stmt.where(or_(func.lower(Loan.loan_number).like(like), func.lower(Loan.party_name).like(like)))
        stmt = stmt.order_by(Loan.loan_date.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def add(self, loan: Loan) -> None:
        self.db.add(loan)

    def add_installments(self, rows: list[LoanRepaymentInstallment]) -> None:
        self.db.add_all(rows)

    def add_repayment(self, row: LoanRepayment) -> None:
        self.db.add(row)

    def add_ledger_entry(self, row: LoanLedgerEntry) -> None:
        self.db.add(row)

    async def get_installment(self, installment_id: uuid.UUID) -> LoanRepaymentInstallment | None:
        return await self.db.get(LoanRepaymentInstallment, installment_id)

    async def get_installments_for_loan(self, loan_id: uuid.UUID) -> list[LoanRepaymentInstallment]:
        result = await self.db.execute(
            select(LoanRepaymentInstallment)
            .where(LoanRepaymentInstallment.loan_id == loan_id)
            .order_by(LoanRepaymentInstallment.installment_number)
        )
        return list(result.scalars().all())

    async def get_repayments_for_loan(self, loan_id: uuid.UUID) -> list[LoanRepayment]:
        result = await self.db.execute(
            select(LoanRepayment).where(LoanRepayment.loan_id == loan_id).order_by(LoanRepayment.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_ledger_entries_for_loan(self, loan_id: uuid.UUID) -> list[LoanLedgerEntry]:
        result = await self.db.execute(
            select(LoanLedgerEntry).where(LoanLedgerEntry.loan_id == loan_id).order_by(LoanLedgerEntry.created_at.desc())
        )
        return list(result.scalars().all())

    async def delete(self, loan: Loan) -> None:
        await self.db.delete(loan)

