import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import DeliveryStatus, DeliveryZone, ExtraItemRequestedBy


class DispatchRequest(BaseModel):
    driver_id: uuid.UUID
    zone: DeliveryZone
    truck_number: str = Field(min_length=1)


class ExtraItemRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)


class MarkDeliveredRequest(BaseModel):
    delivered_quantity: int = Field(ge=0)
    crates_out: int = Field(ge=0)
    crates_in: int = Field(ge=0)
    extra_items: list[ExtraItemRequest] = Field(default_factory=list)


class RequestExtraItemsRequest(BaseModel):
    extra_items: list[ExtraItemRequest] = Field(min_length=1)


class DeliveryExtraItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    requested_by: ExtraItemRequestedBy


class DeliveryOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: uuid.UUID
    product_name: str
    quantity: int
    crates_qty: int


class DeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    order_no: str
    vendor_name: str | None
    driver_id: uuid.UUID | None
    driver_name: str | None
    zone: DeliveryZone | None
    truck_number: str | None
    status: DeliveryStatus
    delivered_quantity: int | None
    crates_out: int
    crates_in: int
    items: list[DeliveryOrderItemResponse]
    extra_items: list[DeliveryExtraItemResponse]
    delivered_at: datetime | None
    confirmed_at: datetime | None
