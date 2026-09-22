import uuid
from datetime import date
from decimal import Decimal
from typing import NamedTuple

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import TransportOwnership
from app.models.purchase_item_category import PurchaseItemCategory
from app.models.transport import Transport
from app.models.transport_bill import TransportBill
from app.models.transport_zone import TransportZone


class ZoneWiseRow(NamedTuple):
    zone_id: uuid.UUID
    zone_name: str
    bill_count: int
    total_amount: Decimal


class CategoryWiseRow(NamedTuple):
    category_id: uuid.UUID
    category_name: str
    bill_count: int
    total_amount: Decimal


class TransportSummaryRow(NamedTuple):
    total_transport: int
    own_count: int
    rented_count: int
    total_km_running: Decimal
    total_bill_amount: Decimal


class TransportBillRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def _select_with_relations(self) -> Select[tuple[TransportBill]]:
        return select(TransportBill).options(
            selectinload(TransportBill.transport),
            selectinload(TransportBill.zone),
            selectinload(TransportBill.category),
        )

    async def get_by_id(self, bill_id: uuid.UUID) -> TransportBill | None:
        result = await self.db.execute(self._select_with_relations().where(TransportBill.id == bill_id))
        return result.scalar_one_or_none()

    async def list_between(self, start: date, end: date) -> list[TransportBill]:
        result = await self.db.execute(
            self._select_with_relations()
            .where(TransportBill.bill_date >= start, TransportBill.bill_date <= end)
            .order_by(TransportBill.bill_date.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[TransportBill]:
        result = await self.db.execute(self._select_with_relations().order_by(TransportBill.bill_date.desc()))
        return list(result.scalars().all())

    def add(self, bill: TransportBill) -> None:
        self.db.add(bill)

    async def delete(self, bill: TransportBill) -> None:
        await self.db.delete(bill)

    async def zone_wise(self, start: date | None, end: date | None) -> list[ZoneWiseRow]:
        bills = select(TransportBill)
        if start is not None and end is not None:
            bills = bills.where(TransportBill.bill_date >= start, TransportBill.bill_date <= end)
        bills_subq = bills.subquery()

        stmt = (
            select(
                TransportZone.id,
                TransportZone.name,
                func.count(bills_subq.c.id),
                func.coalesce(func.sum(bills_subq.c.amount), 0),
            )
            .select_from(TransportZone)
            .outerjoin(bills_subq, bills_subq.c.zone_id == TransportZone.id)
            .group_by(TransportZone.id, TransportZone.name)
            .order_by(TransportZone.name)
        )
        result = await self.db.execute(stmt)
        return [ZoneWiseRow(*row) for row in result.all()]

    async def category_wise(self, start: date | None, end: date | None) -> list[CategoryWiseRow]:
        bills = select(TransportBill)
        if start is not None and end is not None:
            bills = bills.where(TransportBill.bill_date >= start, TransportBill.bill_date <= end)
        bills_subq = bills.subquery()

        stmt = (
            select(
                PurchaseItemCategory.id,
                PurchaseItemCategory.name,
                func.count(bills_subq.c.id),
                func.coalesce(func.sum(bills_subq.c.amount), 0),
            )
            .select_from(PurchaseItemCategory)
            .outerjoin(bills_subq, bills_subq.c.purchase_item_category_id == PurchaseItemCategory.id)
            .group_by(PurchaseItemCategory.id, PurchaseItemCategory.name)
            .order_by(PurchaseItemCategory.name)
        )
        result = await self.db.execute(stmt)
        return [CategoryWiseRow(*row) for row in result.all()]

    async def summary(self, start: date | None, end: date | None) -> TransportSummaryRow:
        total_transport = (await self.db.execute(select(func.count(Transport.id)))).scalar_one()
        own_count = (
            await self.db.execute(
                select(func.count(Transport.id)).where(Transport.ownership == TransportOwnership.OWN)
            )
        ).scalar_one()
        rented_count = (
            await self.db.execute(
                select(func.count(Transport.id)).where(Transport.ownership == TransportOwnership.RENT)
            )
        ).scalar_one()
        total_km_running = (
            await self.db.execute(select(func.coalesce(func.sum(Transport.km_running_track), 0)))
        ).scalar_one()

        bill_amount_stmt = select(func.coalesce(func.sum(TransportBill.amount), 0))
        if start is not None and end is not None:
            bill_amount_stmt = bill_amount_stmt.where(
                TransportBill.bill_date >= start, TransportBill.bill_date <= end
            )
        total_bill_amount = (await self.db.execute(bill_amount_stmt)).scalar_one()

        return TransportSummaryRow(
            total_transport=total_transport,
            own_count=own_count,
            rented_count=rented_count,
            total_km_running=total_km_running,
            total_bill_amount=total_bill_amount,
        )
