import uuid

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.category import Category
from app.models.product import Product
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreateRequest, CategoryUpdateRequest
from app.services.audit_service import AuditService


class CategoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = CategoryRepository(db)
        self.audit = AuditService(db)

    async def list_categories(self) -> list[tuple[Category, int]]:
        return await self.repo.list_with_counts()

    async def get_item_count(self, name: str) -> int:
        return await self.repo.count_for_name(name)

    async def create_category(self, data: CategoryCreateRequest, actor_name: str) -> Category:
        if await self.repo.get_by_name(data.name) is not None:
            raise ConflictError(f"Category {data.name} already exists")
        category = Category(name=data.name)
        self.repo.add(category)
        self.audit.log(actor_name, f"created category {data.name}")
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def rename_category(self, category_id: uuid.UUID, data: CategoryUpdateRequest, actor_name: str) -> Category:
        category = await self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Category not found")
        old_name = category.name
        if data.name != old_name:
            clashing = await self.repo.get_by_name(data.name)
            if clashing is not None and clashing.id != category.id:
                raise ConflictError(f"Category {data.name} already exists")
            category.name = data.name
            await self.db.execute(update(Product).where(Product.category == old_name).values(category=data.name))
            self.audit.log(actor_name, f"renamed category {old_name} to {data.name}", entity_type="category", entity_id=category.id)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete_category(self, category_id: uuid.UUID, actor_name: str) -> None:
        category = await self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Category not found")
        item_count = await self.repo.count_for_name(category.name)
        if item_count > 0:
            raise BusinessRuleError(f"Category {category.name} still has {item_count} item(s) assigned")
        self.audit.log(actor_name, f"deleted category {category.name}", entity_type="category", entity_id=category.id)
        await self.repo.delete(category)
        await self.db.commit()

    async def ensure_category(self, name: str | None) -> None:
        """Keeps the category master list in sync when a product references a not-yet-tracked category name."""
        if not name:
            return
        if await self.repo.get_by_name(name) is None:
            self.repo.add(Category(name=name))
