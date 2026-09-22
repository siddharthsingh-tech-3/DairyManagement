import uuid

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.expense import Expense
from app.models.expense_category import ExpenseCategory
from app.repositories.expense_category_repository import ExpenseCategoryRepository
from app.schemas.expense_category import ExpenseCategoryCreateRequest, ExpenseCategoryUpdateRequest
from app.services.audit_service import AuditService


class ExpenseCategoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = ExpenseCategoryRepository(db)
        self.audit = AuditService(db)

    async def list_categories(self) -> list[tuple[ExpenseCategory, int]]:
        return await self.repo.list_with_counts()

    async def get_item_count(self, name: str) -> int:
        return await self.repo.count_for_name(name)

    async def create_category(self, data: ExpenseCategoryCreateRequest, actor_name: str) -> ExpenseCategory:
        if await self.repo.get_by_name(data.name) is not None:
            raise ConflictError(f"Expense category {data.name} already exists")
        category = ExpenseCategory(name=data.name)
        self.repo.add(category)
        self.audit.log(actor_name, f"created expense category {data.name}")
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def rename_category(
        self, category_id: uuid.UUID, data: ExpenseCategoryUpdateRequest, actor_name: str
    ) -> ExpenseCategory:
        category = await self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Expense category not found")
        old_name = category.name
        if data.name != old_name:
            clashing = await self.repo.get_by_name(data.name)
            if clashing is not None and clashing.id != category.id:
                raise ConflictError(f"Expense category {data.name} already exists")
            category.name = data.name
            await self.db.execute(update(Expense).where(Expense.category == old_name).values(category=data.name))
            self.audit.log(
                actor_name,
                f"renamed expense category {old_name} to {data.name}",
                entity_type="expense_category",
                entity_id=category.id,
            )
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete_category(self, category_id: uuid.UUID, actor_name: str) -> None:
        category = await self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Expense category not found")
        item_count = await self.repo.count_for_name(category.name)
        if item_count > 0:
            raise BusinessRuleError(f"Expense category {category.name} still has {item_count} expense(s) assigned")
        self.audit.log(
            actor_name, f"deleted expense category {category.name}", entity_type="expense_category", entity_id=category.id
        )
        await self.repo.delete(category)
        await self.db.commit()

    async def ensure_category(self, name: str | None) -> None:
        """Keeps the category master list in sync when an expense references a not-yet-tracked category name."""
        if not name:
            return
        if await self.repo.get_by_name(name) is None:
            self.repo.add(ExpenseCategory(name=name))
