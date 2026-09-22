from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_setting import BusinessSetting
from app.repositories.business_setting_repository import BusinessSettingRepository
from app.services.audit_service import AuditService

DEFAULTS = {
    "business_name": "Kshirsagar Dairy",
    "gstin": "27ABCDE1234F1Z5",
    "upi_id": "kshirsagardairy@upi",
    "same_day_order_cutoff_hour": "6",
    "next_day_order_cutoff_hour": "21",
}


class BusinessSettingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BusinessSettingRepository(db)
        self.audit = AuditService(db)

    async def list_settings(self) -> list[BusinessSetting]:
        existing = await self.repo.list_all()
        existing_keys = {s.key for s in existing}
        for key, value in DEFAULTS.items():
            if key not in existing_keys:
                self.repo.add(BusinessSetting(key=key, value=value))
        if len(existing_keys) < len(DEFAULTS):
            await self.db.commit()
            existing = await self.repo.list_all()
        return existing

    async def upsert(self, key: str, value: str, actor_name: str) -> BusinessSetting:
        setting = await self.repo.get(key)
        if setting is None:
            setting = BusinessSetting(key=key, value=value)
            self.repo.add(setting)
        else:
            setting.value = value
        self.audit.log(actor_name, f"updated setting {key}")
        await self.db.commit()
        await self.db.refresh(setting)
        return setting
