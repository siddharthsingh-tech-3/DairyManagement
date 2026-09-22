import uuid

from pydantic import BaseModel, Field


class PurchaseItemCategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class PurchaseItemCategoryUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class PurchaseItemCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    bill_count: int
