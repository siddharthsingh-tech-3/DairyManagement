from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_setting import BusinessSetting


class BusinessSettingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_all(self) -> list[BusinessSetting]:
        result = await self.db.execute(select(BusinessSetting).order_by(BusinessSetting.key))
        return list(result.scalars().all())

    async def get(self, key: str) -> BusinessSetting | None:
        result = await self.db.execute(select(BusinessSetting).where(BusinessSetting.key == key))
        return result.scalar_one_or_none()

    def add(self, setting: BusinessSetting) -> None:
        self.db.add(setting)
