from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import UserRole
from app.models.permission import Permission


class PermissionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_all(self) -> list[Permission]:
        result = await self.db.execute(select(Permission).order_by(Permission.feature))
        return list(result.scalars().all())

    async def get(self, feature: str, role: UserRole) -> Permission | None:
        result = await self.db.execute(
            select(Permission).where(Permission.feature == feature, Permission.role == role)
        )
        return result.scalar_one_or_none()

    def add(self, permission: Permission) -> None:
        self.db.add(permission)
