import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.offer import Offer
from app.models.product import Product


class OfferRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, offer_id: uuid.UUID) -> Offer | None:
        result = await self.db.execute(
            select(Offer).options(selectinload(Offer.products)).where(Offer.id == offer_id)
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Offer]:
        result = await self.db.execute(
            select(Offer).options(selectinload(Offer.products)).order_by(Offer.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_products_by_ids(self, ids: list[uuid.UUID]) -> list[Product]:
        if not ids:
            return []
        result = await self.db.execute(select(Product).where(Product.id.in_(ids)))
        return list(result.scalars().all())

    def add(self, offer: Offer) -> None:
        self.db.add(offer)

    async def delete(self, offer: Offer) -> None:
        await self.db.delete(offer)
