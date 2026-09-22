from sqlalchemy.ext.asyncio import AsyncSession

from app.models.driver import Driver
from app.repositories.driver_repository import DriverRepository
from app.schemas.driver import DriverCreateRequest
from app.services.audit_service import AuditService


class DriverService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = DriverRepository(db)
        self.audit = AuditService(db)

    async def list_drivers(self) -> list[Driver]:
        return await self.repo.list_active()

    async def create_driver(self, data: DriverCreateRequest, actor_name: str) -> Driver:
        driver = Driver(**data.model_dump())
        self.repo.add(driver)
        self.audit.log(actor_name, f"added driver {data.name} ({data.vehicle_number})")
        await self.db.commit()
        await self.db.refresh(driver)
        return driver
