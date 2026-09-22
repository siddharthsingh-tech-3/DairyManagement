from pydantic import BaseModel

from app.models.enums import PermissionLevel, UserRole


class PermissionEntry(BaseModel):
    feature: str
    role: UserRole
    level: PermissionLevel


class PermissionUpdateRequest(BaseModel):
    feature: str
    role: UserRole
    level: PermissionLevel


class PermissionMatrixResponse(BaseModel):
    permissions: list[PermissionEntry]
