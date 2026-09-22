import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.billing import Invoice, Payment
from app.models.enums import OrderStatus
from app.models.order import Order
from app.repositories.document_numbering import DocumentNumberingMixin


class BillingRepository(DocumentNumberingMixin):
    DOCUMENT_DEFAULT_PREFIXES = {"invoice": "INV-"}
    DOCUMENT_STARTING_SEQ = {"invoice": "1041"}

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def next_invoice_no(self) -> str:
        return await self.next_document_number("invoice")

    async def get_invoice(self, invoice_id: uuid.UUID) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice).where(Invoice.id == invoice_id).options(selectinload(Invoice.items))
        )
        return result.scalar_one_or_none()

    async def list_invoices(self, vendor_id: uuid.UUID | None = None) -> list[Invoice]:
        stmt = select(Invoice).options(selectinload(Invoice.items)).order_by(Invoice.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(Invoice.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def add_invoice(self, invoice: Invoice) -> None:
        self.db.add(invoice)

    async def get_uninvoiced_delivered_orders(
        self, vendor_id: uuid.UUID, period_start: date, period_end: date
    ) -> list[Order]:
        stmt = (
            select(Order)
            .options(selectinload(Order.items))
            .where(
                Order.vendor_id == vendor_id,
                Order.invoice_id.is_(None),
                Order.status.in_([OrderStatus.DELIVERED, OrderStatus.CONFIRMED]),
                Order.delivery_date >= period_start,
                Order.delivery_date <= period_end,
            )
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def add_payment(self, payment: Payment) -> None:
        self.db.add(payment)

    async def list_payments(self, vendor_id: uuid.UUID | None = None) -> list[Payment]:
        stmt = select(Payment).order_by(Payment.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(Payment.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
