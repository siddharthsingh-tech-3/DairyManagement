import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.transport_bill import TransportBill
from app.repositories.purchase_item_category_repository import PurchaseItemCategoryRepository
from app.repositories.transport_bill_repository import TransportBillRepository
from app.repositories.transport_repository import TransportRepository
from app.repositories.transport_zone_repository import TransportZoneRepository
from app.schemas.transport_bill import TransportBillCreateRequest, TransportBillUpdateRequest
from app.services.audit_service import AuditService


class TransportBillService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TransportBillRepository(db)
        self.transports = TransportRepository(db)
        self.zones = TransportZoneRepository(db)
        self.categories = PurchaseItemCategoryRepository(db)
        self.audit = AuditService(db)

    async def list_bills(self, start: date | None = None, end: date | None = None) -> list[TransportBill]:
        if start is not None and end is not None:
            return await self.repo.list_between(start, end)
        return await self.repo.list_all()

    async def get_bill(self, bill_id: uuid.UUID) -> TransportBill:
        bill = await self.repo.get_by_id(bill_id)
        if bill is None:
            raise NotFoundError("Transport bill not found")
        return bill

    async def _validate_references(
        self, transport_id: uuid.UUID, zone_id: uuid.UUID, purchase_item_category_id: uuid.UUID
    ) -> str:
        transport = await self.transports.get_by_id(transport_id)
        if transport is None:
            raise NotFoundError("Transport not found")
        zone = await self.zones.get_by_id(zone_id)
        if zone is None:
            raise NotFoundError("Transport zone not found")
        category = await self.categories.get_by_id(purchase_item_category_id)
        if category is None:
            raise NotFoundError("Purchase item category not found")
        return transport.vehicle_number

    async def create_bill(
        self, data: TransportBillCreateRequest, actor_name: str, actor_id: uuid.UUID
    ) -> TransportBill:
        vehicle_number = await self._validate_references(
            data.transport_id, data.zone_id, data.purchase_item_category_id
        )
        bill = TransportBill(
            bill_date=data.bill_date,
            transport_id=data.transport_id,
            vehicle_number=vehicle_number,
            zone_id=data.zone_id,
            purchase_item_category_id=data.purchase_item_category_id,
            bill_number=data.bill_number,
            amount=data.amount,
            note=data.note,
            created_by=actor_id,
        )
        self.repo.add(bill)
        self.audit.log(actor_name, f"logged transport bill of {data.amount} for {vehicle_number}")
        await self.db.commit()
        return await self.get_bill(bill.id)

    async def update_bill(
        self, bill_id: uuid.UUID, data: TransportBillUpdateRequest, actor_name: str
    ) -> TransportBill:
        bill = await self.get_bill(bill_id)
        vehicle_number = await self._validate_references(
            data.transport_id, data.zone_id, data.purchase_item_category_id
        )
        bill.bill_date = data.bill_date
        bill.transport_id = data.transport_id
        bill.vehicle_number = vehicle_number
        bill.zone_id = data.zone_id
        bill.purchase_item_category_id = data.purchase_item_category_id
        bill.bill_number = data.bill_number
        bill.amount = data.amount
        bill.note = data.note
        self.audit.log(
            actor_name,
            f"updated transport bill of {data.amount} for {vehicle_number}",
            entity_type="transport_bill",
            entity_id=bill.id,
        )
        await self.db.commit()
        return await self.get_bill(bill.id)

    async def delete_bill(self, bill_id: uuid.UUID, actor_name: str) -> None:
        bill = await self.get_bill(bill_id)
        self.audit.log(
            actor_name,
            f"deleted transport bill of {bill.amount} for {bill.vehicle_number}",
            entity_type="transport_bill",
            entity_id=bill.id,
        )
        await self.repo.delete(bill)
        await self.db.commit()
