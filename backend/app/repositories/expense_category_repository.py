import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense
from app.models.expense_category import ExpenseCategory


class ExpenseCategoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, category_id: uuid.UUID) -> ExpenseCategory | None:
        return await self.db.get(ExpenseCategory, category_id)

    async def get_by_name(self, name: str) -> ExpenseCategory | None:
        result = await self.db.execute(select(ExpenseCategory).where(ExpenseCategory.name == name))
        return result.scalar_one_or_none()

    async def list_with_counts(self) -> list[tuple[ExpenseCategory, int]]:
        counts_subq = (
            select(Expense.category, func.count(Expense.id).label("cnt"))
            .group_by(Expense.category)
            .subquery()
        )
        result = await self.db.execute(
            select(ExpenseCategory, func.coalesce(counts_subq.c.cnt, 0))
            .outerjoin(counts_subq, counts_subq.c.category == ExpenseCategory.name)
            .order_by(ExpenseCategory.name)
        )
        return [(row[0], row[1]) for row in result.all()]

    async def count_for_name(self, name: str) -> int:
        result = await self.db.execute(select(func.count(Expense.id)).where(Expense.category == name))
        return result.scalar_one()

    def add(self, category: ExpenseCategory) -> None:
        self.db.add(category)

    async def delete(self, category: ExpenseCategory) -> None:
        await self.db.delete(category)
