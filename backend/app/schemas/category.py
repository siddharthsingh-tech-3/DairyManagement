import uuid

from pydantic import BaseModel, Field


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class CategoryUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    item_count: int
