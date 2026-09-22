import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.expense import Expense
from app.models.expense_item import ExpenseItem
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.expense import ExpenseCreateRequest
from app.services.audit_service import AuditService
from app.services.expense_category_service import ExpenseCategoryService


class ExpenseService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = ExpenseRepository(db)
        self.audit = AuditService(db)
        self.categories = ExpenseCategoryService(db)

    async def list_expenses(self, start: date | None = None, end: date | None = None) -> list[Expense]:
        if start is not None and end is not None:
            return await self.repo.list_between(start, end)
        return await self.repo.list_all()

    async def get_expense(self, expense_id: uuid.UUID) -> Expense:
        expense = await self.repo.get_by_id(expense_id)
        if expense is None:
            raise NotFoundError("Expense not found")
        return expense

    async def create_expense(self, data: ExpenseCreateRequest, actor_name: str, actor_id: uuid.UUID) -> Expense:
        if data.expense_number:
            if await self.repo.get_by_number(data.expense_number) is not None:
                raise ConflictError(f"Expense number {data.expense_number} is already in use")
            expense_number = data.expense_number
            await self.repo.reserve_document_number("expense", expense_number)
        else:
            expense_number = await self.repo.next_document_number("expense")

        items = [
            ExpenseItem(description=i.description, amount=i.amount, tax_percent=i.tax_percent if data.is_gst_applicable else Decimal("0"))
            for i in data.items
        ]
        amount = sum((i.amount * (1 + i.tax_percent / 100) for i in items), Decimal("0"))

        await self.categories.ensure_category(data.category)
        expense = Expense(
            expense_number=expense_number,
            category=data.category,
            amount=amount,
            expense_date=data.expense_date,
            payee=data.payee,
            payment_mode=data.payment_mode,
            original_invoice_number=data.original_invoice_number,
            is_gst_applicable=data.is_gst_applicable,
            is_paid=data.is_paid,
            note=data.note,
            items=items,
            created_by=actor_id,
        )
        self.repo.add(expense)
        self.audit.log(actor_name, f"logged {data.category} expense of {amount}")
        await self.db.commit()
        return await self.get_expense(expense.id)

    async def mark_paid(self, expense_id: uuid.UUID, actor_name: str) -> Expense:
        expense = await self.get_expense(expense_id)
        expense.is_paid = True
        self.audit.log(actor_name, f"marked {expense.category} expense of {expense.amount} as paid")
        await self.db.commit()
        return await self.get_expense(expense_id)

    async def delete_expense(self, expense_id: uuid.UUID, actor_name: str) -> None:
        expense = await self.get_expense(expense_id)
        self.audit.log(actor_name, f"deleted {expense.category} expense of {expense.amount}")
        await self.repo.delete(expense)
        await self.db.commit()
