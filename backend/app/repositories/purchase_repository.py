import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.purchase import (
    DebitNote,
    PaymentOut,
    PurchaseInvoice,
    PurchaseOrder,
    PurchaseReturn,
)
from app.repositories.document_numbering import DocumentNumberingMixin


class PurchaseRepository(DocumentNumberingMixin):
    DOCUMENT_DEFAULT_PREFIXES = {
        "purchase_order": "PO-",
        "purchase_invoice": "BILL-",
        "payment_out": "PAY-OUT-",
        "purchase_return": "PR-",
        "debit_note": "DN-",
    }

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_purchase_invoice_by_number(self, invoice_number: str) -> PurchaseInvoice | None:
        result = await self.db.execute(
            select(PurchaseInvoice).where(PurchaseInvoice.invoice_number == invoice_number)
        )
        return result.scalar_one_or_none()

    async def get_payment_out_by_number(self, payment_number: str) -> PaymentOut | None:
        result = await self.db.execute(
            select(PaymentOut).where(PaymentOut.payment_number == payment_number)
        )
        return result.scalar_one_or_none()

    async def get_purchase_return_by_number(self, return_number: str) -> PurchaseReturn | None:
        result = await self.db.execute(
            select(PurchaseReturn).where(PurchaseReturn.return_number == return_number)
        )
        return result.scalar_one_or_none()

    async def get_purchase_order_by_number(self, po_number: str) -> PurchaseOrder | None:
        result = await self.db.execute(select(PurchaseOrder).where(PurchaseOrder.po_number == po_number))
        return result.scalar_one_or_none()

    async def get_debit_note_by_number(self, debit_note_number: str) -> DebitNote | None:
        result = await self.db.execute(
            select(DebitNote).where(DebitNote.debit_note_number == debit_note_number)
        )
        return result.scalar_one_or_none()

    # --- purchase orders ---
    def add_purchase_order(self, order: PurchaseOrder) -> None:
        self.db.add(order)

    async def get_purchase_order(self, order_id: uuid.UUID) -> PurchaseOrder | None:
        result = await self.db.execute(
            select(PurchaseOrder).where(PurchaseOrder.id == order_id).options(selectinload(PurchaseOrder.items))
        )
        return result.scalar_one_or_none()

    async def list_purchase_orders(self, vendor_id: uuid.UUID | None = None) -> list[PurchaseOrder]:
        stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.items)).order_by(PurchaseOrder.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(PurchaseOrder.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- purchase invoices ---
    def add_purchase_invoice(self, invoice: PurchaseInvoice) -> None:
        self.db.add(invoice)

    async def get_purchase_invoice(self, invoice_id: uuid.UUID) -> PurchaseInvoice | None:
        result = await self.db.execute(
            select(PurchaseInvoice)
            .where(PurchaseInvoice.id == invoice_id)
            .options(selectinload(PurchaseInvoice.items))
        )
        return result.scalar_one_or_none()

    async def list_purchase_invoices(self, vendor_id: uuid.UUID | None = None) -> list[PurchaseInvoice]:
        stmt = (
            select(PurchaseInvoice)
            .options(selectinload(PurchaseInvoice.items))
            .order_by(PurchaseInvoice.created_at.desc())
        )
        if vendor_id is not None:
            stmt = stmt.where(PurchaseInvoice.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- payments out ---
    def add_payment_out(self, payment: PaymentOut) -> None:
        self.db.add(payment)

    async def get_payment_out(self, payment_id: uuid.UUID) -> PaymentOut | None:
        result = await self.db.execute(
            select(PaymentOut).where(PaymentOut.id == payment_id).options(selectinload(PaymentOut.allocations))
        )
        return result.scalar_one_or_none()

    async def list_payments_out(self, vendor_id: uuid.UUID | None = None) -> list[PaymentOut]:
        stmt = (
            select(PaymentOut).options(selectinload(PaymentOut.allocations)).order_by(PaymentOut.created_at.desc())
        )
        if vendor_id is not None:
            stmt = stmt.where(PaymentOut.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- purchase returns ---
    def add_purchase_return(self, purchase_return: PurchaseReturn) -> None:
        self.db.add(purchase_return)

    async def list_purchase_returns(self, vendor_id: uuid.UUID | None = None) -> list[PurchaseReturn]:
        stmt = (
            select(PurchaseReturn)
            .options(selectinload(PurchaseReturn.items))
            .order_by(PurchaseReturn.created_at.desc())
        )
        if vendor_id is not None:
            stmt = stmt.where(PurchaseReturn.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- debit notes ---
    def add_debit_note(self, debit_note: DebitNote) -> None:
        self.db.add(debit_note)

    async def list_debit_notes(self, vendor_id: uuid.UUID | None = None) -> list[DebitNote]:
        stmt = select(DebitNote).options(selectinload(DebitNote.items)).order_by(DebitNote.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(DebitNote.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
