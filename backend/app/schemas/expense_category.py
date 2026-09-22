import uuid

from pydantic import BaseModel, Field


class ExpenseCategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class ExpenseCategoryUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class ExpenseCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    item_count: int
