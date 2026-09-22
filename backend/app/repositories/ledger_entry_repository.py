import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import LedgerEntryCategory
from app.models.ledger_entry import ManualLedgerEntry


class LedgerEntryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, entry_id: uuid.UUID) -> ManualLedgerEntry | None:
        return await self.db.get(ManualLedgerEntry, entry_id)

    async def list_by_category(self, category: LedgerEntryCategory) -> list[ManualLedgerEntry]:
        result = await self.db.execute(
            select(ManualLedgerEntry)
            .where(ManualLedgerEntry.category == category)
            .order_by(ManualLedgerEntry.entry_date.desc())
        )
        return list(result.scalars().all())

    async def sum_by_category(self, category: LedgerEntryCategory) -> Decimal:
        result = await self.db.execute(
            select(func.coalesce(func.sum(ManualLedgerEntry.amount), 0)).where(
                ManualLedgerEntry.category == category
            )
        )
        return Decimal(result.scalar_one())

    def add(self, entry: ManualLedgerEntry) -> None:
        self.db.add(entry)

    async def delete(self, entry: ManualLedgerEntry) -> None:
        await self.db.delete(entry)
