import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class TenantCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    slug: str = Field(min_length=1, max_length=100)
    admin_email: EmailStr
    admin_name: str = Field(min_length=1, max_length=150)
    admin_password: str = Field(min_length=8)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not SLUG_RE.match(v):
            raise ValueError("slug must be lowercase letters, numbers, and hyphens only")
        return v


class TenantUpdateRequest(BaseModel):
    is_active: bool


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    created_at: datetime
