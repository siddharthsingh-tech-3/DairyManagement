import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.product import Product


class CategoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, category_id: uuid.UUID) -> Category | None:
        return await self.db.get(Category, category_id)

    async def get_by_name(self, name: str) -> Category | None:
        result = await self.db.execute(select(Category).where(Category.name == name))
        return result.scalar_one_or_none()

    async def list_with_counts(self) -> list[tuple[Category, int]]:
        counts_subq = (
            select(Product.category, func.count(Product.id).label("cnt"))
            .where(Product.is_active.is_(True), Product.category.is_not(None))
            .group_by(Product.category)
            .subquery()
        )
        result = await self.db.execute(
            select(Category, func.coalesce(counts_subq.c.cnt, 0))
            .outerjoin(counts_subq, counts_subq.c.category == Category.name)
            .order_by(Category.name)
        )
        return [(row[0], row[1]) for row in result.all()]

    async def count_for_name(self, name: str) -> int:
        result = await self.db.execute(
            select(func.count(Product.id)).where(Product.category == name, Product.is_active.is_(True))
        )
        return result.scalar_one()

    def add(self, category: Category) -> None:
        self.db.add(category)

    async def delete(self, category: Category) -> None:
        await self.db.delete(category)
