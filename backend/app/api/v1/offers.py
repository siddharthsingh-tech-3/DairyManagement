import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.auth import get_current_active_user
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.offer import OfferCreateRequest, OfferResponse, OfferUpdateRequest
from app.services.offer_service import OfferService

router = APIRouter(prefix="/offers", tags=["offers"])

full_dep = require_permission(PermissionFeature.PRODUCTS, PermissionLevel.FULL)


@router.get("")
async def list_offers(_: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)) -> dict:
    offers = await OfferService(db).list_offers()
    return success_envelope([OfferResponse.model_validate(o).model_dump() for o in offers])


@router.post("")
async def create_offer(
    payload: OfferCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    offer = await OfferService(db).create_offer(payload, actor.full_name)
    return success_envelope(OfferResponse.model_validate(offer).model_dump(), "Offer created")


@router.patch("/{offer_id}")
async def update_offer(
    offer_id: uuid.UUID,
    payload: OfferUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    offer = await OfferService(db).update_offer(offer_id, payload, actor.full_name)
    return success_envelope(OfferResponse.model_validate(offer).model_dump(), "Offer updated")


@router.delete("/{offer_id}")
async def delete_offer(
    offer_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await OfferService(db).delete_offer(offer_id, actor.full_name)
    return success_envelope(None, "Offer deleted")
