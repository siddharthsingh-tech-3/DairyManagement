import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, StockMovement


class ProductRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        return await self.db.get(Product, product_id)

    async def get_by_sku(self, sku: str) -> Product | None:
        result = await self.db.execute(select(Product).where(Product.sku == sku))
        return result.scalar_one_or_none()

    async def list_active(self) -> list[Product]:
        result = await self.db.execute(
            select(Product).where(Product.is_active.is_(True)).order_by(Product.name)
        )
        return list(result.scalars().all())

    def add(self, product: Product) -> None:
        self.db.add(product)

    def add_movement(self, movement: StockMovement) -> None:
        self.db.add(movement)
