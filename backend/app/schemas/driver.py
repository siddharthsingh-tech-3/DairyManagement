import uuid

from pydantic import BaseModel, ConfigDict, Field


class DriverCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    phone: str = Field(min_length=6, max_length=20)
    vehicle_number: str = Field(min_length=1, max_length=20)
    route: str = Field(min_length=1, max_length=50)


class DriverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str
    vehicle_number: str
    route: str
    is_active: bool
