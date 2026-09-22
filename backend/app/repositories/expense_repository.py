import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.expense import Expense
from app.repositories.document_numbering import DocumentNumberingMixin


class ExpenseRepository(DocumentNumberingMixin):
    DOCUMENT_DEFAULT_PREFIXES = {"expense": "EXP-"}

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, expense_id: uuid.UUID) -> Expense | None:
        result = await self.db.execute(
            select(Expense).where(Expense.id == expense_id).options(selectinload(Expense.items))
        )
        return result.scalar_one_or_none()

    async def get_by_number(self, expense_number: str) -> Expense | None:
        result = await self.db.execute(select(Expense).where(Expense.expense_number == expense_number))
        return result.scalar_one_or_none()

    async def list_between(self, start: date, end: date) -> list[Expense]:
        result = await self.db.execute(
            select(Expense)
            .where(Expense.expense_date >= start, Expense.expense_date <= end)
            .options(selectinload(Expense.items))
            .order_by(Expense.expense_date.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Expense]:
        result = await self.db.execute(
            select(Expense).options(selectinload(Expense.items)).order_by(Expense.expense_date.desc())
        )
        return list(result.scalars().all())

    async def list_recent(self, limit: int) -> list[Expense]:
        result = await self.db.execute(
            select(Expense).order_by(Expense.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    def add(self, expense: Expense) -> None:
        self.db.add(expense)

    async def delete(self, expense: Expense) -> None:
        await self.db.delete(expense)
