import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transport_bill import TransportBill
from app.models.transport_zone import TransportZone


class TransportZoneRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, zone_id: uuid.UUID) -> TransportZone | None:
        return await self.db.get(TransportZone, zone_id)

    async def get_by_name(self, name: str) -> TransportZone | None:
        result = await self.db.execute(select(TransportZone).where(TransportZone.name == name))
        return result.scalar_one_or_none()

    async def list_with_counts(self) -> list[tuple[TransportZone, int]]:
        counts_subq = (
            select(TransportBill.zone_id, func.count(TransportBill.id).label("cnt"))
            .group_by(TransportBill.zone_id)
            .subquery()
        )
        result = await self.db.execute(
            select(TransportZone, func.coalesce(counts_subq.c.cnt, 0))
            .outerjoin(counts_subq, counts_subq.c.zone_id == TransportZone.id)
            .order_by(TransportZone.name)
        )
        return [(row[0], row[1]) for row in result.all()]

    async def count_for_zone(self, zone_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count(TransportBill.id)).where(TransportBill.zone_id == zone_id)
        )
        return result.scalar_one()

    def add(self, zone: TransportZone) -> None:
        self.db.add(zone)

    async def delete(self, zone: TransportZone) -> None:
        await self.db.delete(zone)
