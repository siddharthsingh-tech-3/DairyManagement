import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class UserCreateRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=150)
    role: UserRole
    vendor_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    phone: str | None = None
    is_active: bool | None = None


class UserSetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    phone: str | None
    full_name: str
    role: UserRole
    vendor_id: uuid.UUID | None
    driver_id: uuid.UUID | None
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    tenant_name: str | None = None
    is_platform_admin: bool = False
