import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.vendor import Vendor, VendorBankAccount, VendorCustomField, VendorLedgerEntry


class VendorRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, vendor_id: uuid.UUID) -> Vendor | None:
        return await self.db.get(Vendor, vendor_id)

    async def get_with_ledger(self, vendor_id: uuid.UUID) -> Vendor | None:
        result = await self.db.execute(
            select(Vendor)
            .where(Vendor.id == vendor_id)
            .options(
                selectinload(Vendor.ledger_entries),
                selectinload(Vendor.bank_accounts),
                selectinload(Vendor.custom_fields),
            )
        )
        return result.scalar_one_or_none()

    async def get_next_code(self) -> str:
        result = await self.db.execute(select(func.count()).select_from(Vendor))
        count = result.scalar_one()
        return f"V{count + 1:02d}"

    async def search(self, query: str | None, is_supplier: bool | None = None) -> list[Vendor]:
        stmt = select(Vendor).where(Vendor.is_active.is_(True))
        if query:
            like = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Vendor.name).like(like),
                    func.lower(Vendor.contact_name).like(like),
                    func.lower(Vendor.area).like(like),
                )
            )
        if is_supplier is not None:
            stmt = stmt.where(Vendor.is_supplier.is_(is_supplier))
        stmt = stmt.order_by(Vendor.name)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def add(self, vendor: Vendor) -> None:
        self.db.add(vendor)

    def add_ledger_entry(self, entry: VendorLedgerEntry) -> None:
        self.db.add(entry)

    def add_bank_account(self, account: VendorBankAccount) -> None:
        self.db.add(account)

    async def get_bank_account(self, account_id: uuid.UUID) -> VendorBankAccount | None:
        return await self.db.get(VendorBankAccount, account_id)

    async def delete_bank_account(self, account: VendorBankAccount) -> None:
        await self.db.delete(account)

    def add_custom_field(self, field: VendorCustomField) -> None:
        self.db.add(field)

    async def get_custom_field(self, field_id: uuid.UUID) -> VendorCustomField | None:
        return await self.db.get(VendorCustomField, field_id)

    async def delete_custom_field(self, field: VendorCustomField) -> None:
        await self.db.delete(field)
