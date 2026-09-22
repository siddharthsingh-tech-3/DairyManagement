import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.enums import LedgerEntryCategory
from app.models.ledger_entry import ManualLedgerEntry
from app.repositories.ledger_entry_repository import LedgerEntryRepository
from app.schemas.ledger_entry import LedgerEntryCreateRequest
from app.services.audit_service import AuditService


class LedgerEntryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = LedgerEntryRepository(db)
        self.audit = AuditService(db)

    async def list_by_category(self, category: LedgerEntryCategory) -> list[ManualLedgerEntry]:
        return await self.repo.list_by_category(category)

    async def create(
        self, data: LedgerEntryCreateRequest, actor_name: str, actor_id: uuid.UUID
    ) -> ManualLedgerEntry:
        entry = ManualLedgerEntry(**data.model_dump(), created_by=actor_id)
        self.repo.add(entry)
        self.audit.log(actor_name, f"added {data.category.value} balance sheet entry of {data.amount}")
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def delete(self, entry_id: uuid.UUID, actor_name: str) -> None:
        entry = await self.repo.get_by_id(entry_id)
        if entry is None:
            raise NotFoundError("Ledger entry not found")
        self.audit.log(actor_name, f"removed {entry.category.value} balance sheet entry of {entry.amount}")
        await self.repo.delete(entry)
        await self.db.commit()
