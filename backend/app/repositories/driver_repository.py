from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver


class DriverRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_active(self) -> list[Driver]:
        result = await self.db.execute(select(Driver).where(Driver.is_active.is_(True)).order_by(Driver.name))
        return list(result.scalars().all())

    def add(self, driver: Driver) -> None:
        self.db.add(driver)
