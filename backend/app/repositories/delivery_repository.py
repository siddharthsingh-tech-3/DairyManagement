import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.delivery import Delivery, DeliveryExtraItem
from app.models.order import Order


class DeliveryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, delivery_id: uuid.UUID) -> Delivery | None:
        result = await self.db.execute(
            select(Delivery).where(Delivery.id == delivery_id).options(selectinload(Delivery.extra_items))
        )
        return result.scalar_one_or_none()

    async def list_all(
        self, driver_id: uuid.UUID | None = None, vendor_id: uuid.UUID | None = None
    ) -> list[tuple[Delivery, Order]]:
        stmt = (
            select(Delivery, Order)
            .join(Order, Order.id == Delivery.order_id)
            .options(selectinload(Delivery.extra_items), selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        if driver_id is not None:
            stmt = stmt.where(Delivery.driver_id == driver_id)
        if vendor_id is not None:
            stmt = stmt.where(Order.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    def add_extra_item(self, item: DeliveryExtraItem) -> None:
        self.db.add(item)
