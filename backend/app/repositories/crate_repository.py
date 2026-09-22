import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crate import CrateDispute, CrateTransaction
from app.models.enums import DisputeStatus


class CrateRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_transactions(self, vendor_id: uuid.UUID | None = None, limit: int = 100) -> list[CrateTransaction]:
        stmt = select(CrateTransaction).order_by(CrateTransaction.created_at.desc()).limit(limit)
        if vendor_id is not None:
            stmt = stmt.where(CrateTransaction.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_all_transactions(self) -> list[CrateTransaction]:
        result = await self.db.execute(select(CrateTransaction))
        return list(result.scalars().all())

    def add_transaction(self, txn: CrateTransaction) -> None:
        self.db.add(txn)

    async def list_disputes(self, status: DisputeStatus | None = None) -> list[CrateDispute]:
        stmt = select(CrateDispute).order_by(CrateDispute.created_at.desc())
        if status is not None:
            stmt = stmt.where(CrateDispute.status == status)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_dispute(self, dispute_id: uuid.UUID) -> CrateDispute | None:
        return await self.db.get(CrateDispute, dispute_id)

    def add_dispute(self, dispute: CrateDispute) -> None:
        self.db.add(dispute)
