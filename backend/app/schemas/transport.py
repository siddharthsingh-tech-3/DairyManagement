import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TransportOwnershipLiteral = Literal["own", "rent"]


class TransportCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    vehicle_number: str = Field(min_length=1, max_length=20)
    ownership: TransportOwnershipLiteral
    measure: str = Field(min_length=1, max_length=50)
    transport_average: Decimal = Field(ge=0)
    diesel_average: Decimal = Field(ge=0)
    km_running_track: Decimal = Field(ge=0)


class TransportUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    vehicle_number: str = Field(min_length=1, max_length=20)
    ownership: TransportOwnershipLiteral
    measure: str = Field(min_length=1, max_length=50)
    transport_average: Decimal = Field(ge=0)
    diesel_average: Decimal = Field(ge=0)
    km_running_track: Decimal = Field(ge=0)


class TransportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    vehicle_number: str
    ownership: TransportOwnershipLiteral
    measure: str
    transport_average: Decimal
    diesel_average: Decimal
    km_running_track: Decimal
    created_at: datetime
