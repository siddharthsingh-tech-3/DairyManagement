import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.offer import Offer
from app.repositories.offer_repository import OfferRepository
from app.schemas.offer import OfferCreateRequest, OfferUpdateRequest
from app.services.audit_service import AuditService


class OfferService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = OfferRepository(db)
        self.audit = AuditService(db)

    async def list_offers(self) -> list[Offer]:
        return await self.repo.list_all()

    async def get_offer(self, offer_id: uuid.UUID) -> Offer:
        offer = await self.repo.get_by_id(offer_id)
        if offer is None:
            raise NotFoundError("Offer not found")
        return offer

    async def create_offer(self, data: OfferCreateRequest, actor_name: str) -> Offer:
        offer = Offer(
            title=data.title,
            description=data.description,
            discount_type=data.discount_type,
            discount_value=data.discount_value,
            valid_from=data.valid_from,
            valid_till=data.valid_till,
            applies_to_all=data.applies_to_all,
        )
        if not data.applies_to_all:
            offer.products = await self.repo.get_products_by_ids(data.product_ids)
        self.repo.add(offer)
        self.audit.log(actor_name, f"created offer {data.title}")
        await self.db.commit()
        await self.db.refresh(offer, attribute_names=["products"])
        return offer

    async def update_offer(self, offer_id: uuid.UUID, data: OfferUpdateRequest, actor_name: str) -> Offer:
        offer = await self.get_offer(offer_id)
        fields = data.model_dump(exclude_unset=True, exclude={"product_ids"})
        for field, value in fields.items():
            setattr(offer, field, value)
        if "product_ids" in data.model_fields_set:
            offer.products = await self.repo.get_products_by_ids(data.product_ids or [])
        self.audit.log(actor_name, f"updated offer {offer.title}", entity_type="offer", entity_id=offer.id)
        await self.db.commit()
        await self.db.refresh(offer, attribute_names=["products"])
        return offer

    async def delete_offer(self, offer_id: uuid.UUID, actor_name: str) -> None:
        offer = await self.get_offer(offer_id)
        await self.repo.delete(offer)
        self.audit.log(actor_name, f"deleted offer {offer.title}")
        await self.db.commit()
