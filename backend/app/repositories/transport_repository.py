import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transport import Transport
from app.models.transport_bill import TransportBill


class TransportRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, transport_id: uuid.UUID) -> Transport | None:
        return await self.db.get(Transport, transport_id)

    async def get_by_vehicle_number(self, vehicle_number: str) -> Transport | None:
        result = await self.db.execute(select(Transport).where(Transport.vehicle_number == vehicle_number))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Transport]:
        result = await self.db.execute(select(Transport).order_by(Transport.name))
        return list(result.scalars().all())

    async def count_bills_for(self, transport_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count(TransportBill.id)).where(TransportBill.transport_id == transport_id)
        )
        return result.scalar_one()

    def add(self, transport: Transport) -> None:
        self.db.add(transport)

    async def delete(self, transport: Transport) -> None:
        await self.db.delete(transport)
