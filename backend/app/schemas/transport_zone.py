import uuid

from pydantic import BaseModel, Field


class TransportZoneCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TransportZoneUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TransportZoneResponse(BaseModel):
    id: uuid.UUID
    name: str
    bill_count: int
