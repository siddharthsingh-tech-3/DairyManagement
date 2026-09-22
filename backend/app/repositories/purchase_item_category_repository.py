import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.purchase_item_category import PurchaseItemCategory
from app.models.transport_bill import TransportBill


class PurchaseItemCategoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, category_id: uuid.UUID) -> PurchaseItemCategory | None:
        return await self.db.get(PurchaseItemCategory, category_id)

    async def get_by_name(self, name: str) -> PurchaseItemCategory | None:
        result = await self.db.execute(select(PurchaseItemCategory).where(PurchaseItemCategory.name == name))
        return result.scalar_one_or_none()

    async def list_with_counts(self) -> list[tuple[PurchaseItemCategory, int]]:
        counts_subq = (
            select(TransportBill.purchase_item_category_id, func.count(TransportBill.id).label("cnt"))
            .group_by(TransportBill.purchase_item_category_id)
            .subquery()
        )
        result = await self.db.execute(
            select(PurchaseItemCategory, func.coalesce(counts_subq.c.cnt, 0))
            .outerjoin(counts_subq, counts_subq.c.purchase_item_category_id == PurchaseItemCategory.id)
            .order_by(PurchaseItemCategory.name)
        )
        return [(row[0], row[1]) for row in result.all()]

    async def count_for_category(self, category_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count(TransportBill.id)).where(TransportBill.purchase_item_category_id == category_id)
        )
        return result.scalar_one()

    def add(self, category: PurchaseItemCategory) -> None:
        self.db.add(category)

    async def delete(self, category: PurchaseItemCategory) -> None:
        await self.db.delete(category)
