import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.enums import TransportOwnership
from app.models.transport import Transport
from app.repositories.transport_repository import TransportRepository
from app.schemas.transport import TransportCreateRequest, TransportUpdateRequest
from app.services.audit_service import AuditService


class TransportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TransportRepository(db)
        self.audit = AuditService(db)

    async def list_transports(self) -> list[Transport]:
        return await self.repo.list_all()

    async def get_transport(self, transport_id: uuid.UUID) -> Transport:
        transport = await self.repo.get_by_id(transport_id)
        if transport is None:
            raise NotFoundError("Transport not found")
        return transport

    async def create_transport(
        self, data: TransportCreateRequest, actor_name: str, actor_id: uuid.UUID
    ) -> Transport:
        if await self.repo.get_by_vehicle_number(data.vehicle_number) is not None:
            raise ConflictError(f"Vehicle number {data.vehicle_number} is already in use")
        transport = Transport(
            name=data.name,
            vehicle_number=data.vehicle_number,
            ownership=TransportOwnership(data.ownership),
            measure=data.measure,
            transport_average=data.transport_average,
            diesel_average=data.diesel_average,
            km_running_track=data.km_running_track,
            created_by=actor_id,
        )
        self.repo.add(transport)
        self.audit.log(actor_name, f"added transport {data.name} ({data.vehicle_number})")
        await self.db.commit()
        await self.db.refresh(transport)
        return transport

    async def update_transport(
        self, transport_id: uuid.UUID, data: TransportUpdateRequest, actor_name: str
    ) -> Transport:
        transport = await self.get_transport(transport_id)
        if data.vehicle_number != transport.vehicle_number:
            clashing = await self.repo.get_by_vehicle_number(data.vehicle_number)
            if clashing is not None and clashing.id != transport.id:
                raise ConflictError(f"Vehicle number {data.vehicle_number} is already in use")
        transport.name = data.name
        transport.vehicle_number = data.vehicle_number
        transport.ownership = TransportOwnership(data.ownership)
        transport.measure = data.measure
        transport.transport_average = data.transport_average
        transport.diesel_average = data.diesel_average
        transport.km_running_track = data.km_running_track
        self.audit.log(
            actor_name,
            f"updated transport {transport.name} ({transport.vehicle_number})",
            entity_type="transport",
            entity_id=transport.id,
        )
        await self.db.commit()
        await self.db.refresh(transport)
        return transport

    async def delete_transport(self, transport_id: uuid.UUID, actor_name: str) -> None:
        transport = await self.get_transport(transport_id)
        bill_count = await self.repo.count_bills_for(transport.id)
        if bill_count > 0:
            raise BusinessRuleError(
                f"Transport {transport.name} still has {bill_count} bill(s) referencing it"
            )
        self.audit.log(
            actor_name,
            f"deleted transport {transport.name} ({transport.vehicle_number})",
            entity_type="transport",
            entity_id=transport.id,
        )
        await self.repo.delete(transport)
        await self.db.commit()
