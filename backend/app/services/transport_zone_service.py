import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.transport_zone import TransportZone
from app.repositories.transport_zone_repository import TransportZoneRepository
from app.schemas.transport_zone import TransportZoneCreateRequest, TransportZoneUpdateRequest
from app.services.audit_service import AuditService


class TransportZoneService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TransportZoneRepository(db)
        self.audit = AuditService(db)

    async def list_zones(self) -> list[tuple[TransportZone, int]]:
        return await self.repo.list_with_counts()

    async def get_bill_count(self, zone_id: uuid.UUID) -> int:
        return await self.repo.count_for_zone(zone_id)

    async def create_zone(self, data: TransportZoneCreateRequest, actor_name: str) -> TransportZone:
        if await self.repo.get_by_name(data.name) is not None:
            raise ConflictError(f"Transport zone {data.name} already exists")
        zone = TransportZone(name=data.name)
        self.repo.add(zone)
        self.audit.log(actor_name, f"created transport zone {data.name}")
        await self.db.commit()
        await self.db.refresh(zone)
        return zone

    async def rename_zone(
        self, zone_id: uuid.UUID, data: TransportZoneUpdateRequest, actor_name: str
    ) -> TransportZone:
        zone = await self.repo.get_by_id(zone_id)
        if zone is None:
            raise NotFoundError("Transport zone not found")
        old_name = zone.name
        if data.name != old_name:
            clashing = await self.repo.get_by_name(data.name)
            if clashing is not None and clashing.id != zone.id:
                raise ConflictError(f"Transport zone {data.name} already exists")
            zone.name = data.name
            self.audit.log(
                actor_name,
                f"renamed transport zone {old_name} to {data.name}",
                entity_type="transport_zone",
                entity_id=zone.id,
            )
        await self.db.commit()
        await self.db.refresh(zone)
        return zone

    async def delete_zone(self, zone_id: uuid.UUID, actor_name: str) -> None:
        zone = await self.repo.get_by_id(zone_id)
        if zone is None:
            raise NotFoundError("Transport zone not found")
        bill_count = await self.repo.count_for_zone(zone.id)
        if bill_count > 0:
            raise BusinessRuleError(f"Transport zone {zone.name} still has {bill_count} bill(s) assigned")
        self.audit.log(
            actor_name, f"deleted transport zone {zone.name}", entity_type="transport_zone", entity_id=zone.id
        )
        await self.repo.delete(zone)
        await self.db.commit()
