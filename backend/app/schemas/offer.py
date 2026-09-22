import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OfferDiscountType


class OfferCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=500)
    discount_type: OfferDiscountType
    discount_value: Decimal = Field(gt=0)
    valid_from: date
    valid_till: date | None = None
    applies_to_all: bool = True
    product_ids: list[uuid.UUID] = Field(default_factory=list)


class OfferUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    discount_type: OfferDiscountType | None = None
    discount_value: Decimal | None = Field(default=None, gt=0)
    valid_from: date | None = None
    valid_till: date | None = None
    applies_to_all: bool | None = None
    product_ids: list[uuid.UUID] | None = None
    is_active: bool | None = None


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    discount_type: OfferDiscountType
    discount_value: Decimal
    valid_from: date
    valid_till: date | None
    applies_to_all: bool
    is_active: bool
    is_running: bool
    product_ids: list[uuid.UUID]
    created_at: datetime
