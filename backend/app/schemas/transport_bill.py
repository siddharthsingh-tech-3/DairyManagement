import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TransportBillCreateRequest(BaseModel):
    bill_date: date
    transport_id: uuid.UUID
    zone_id: uuid.UUID
    purchase_item_category_id: uuid.UUID
    bill_number: str | None = None
    amount: Decimal = Field(ge=0)
    note: str | None = None


class TransportBillUpdateRequest(BaseModel):
    bill_date: date
    transport_id: uuid.UUID
    zone_id: uuid.UUID
    purchase_item_category_id: uuid.UUID
    bill_number: str | None = None
    amount: Decimal = Field(ge=0)
    note: str | None = None


class TransportBillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bill_date: date
    transport_id: uuid.UUID
    transport_name: str
    vehicle_number: str
    zone_id: uuid.UUID
    zone_name: str
    purchase_item_category_id: uuid.UUID
    category_name: str
    bill_number: str | None
    amount: Decimal
    note: str | None
    created_at: datetime
