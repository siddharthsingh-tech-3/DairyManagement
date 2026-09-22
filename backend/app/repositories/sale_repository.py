import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sale import (
    CreditNote,
    DeliveryChallan,
    PaymentIn,
    ProformaInvoice,
    Quotation,
    SalesInvoice,
    SalesReturn,
)
from app.repositories.document_numbering import DocumentNumberingMixin


class SaleRepository(DocumentNumberingMixin):
    DOCUMENT_DEFAULT_PREFIXES = {
        "quotation": "EST-",
        "sales_invoice": "INV-",
        "payment_in": "PAY-IN-",
        "sales_return": "SR-",
        "credit_note": "CN-",
        "delivery_challan": "DC-",
        "proforma_invoice": "PF-",
    }

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_sales_invoice_by_number(self, invoice_number: str) -> SalesInvoice | None:
        result = await self.db.execute(select(SalesInvoice).where(SalesInvoice.invoice_number == invoice_number))
        return result.scalar_one_or_none()

    async def get_payment_in_by_number(self, payment_number: str) -> PaymentIn | None:
        result = await self.db.execute(select(PaymentIn).where(PaymentIn.payment_number == payment_number))
        return result.scalar_one_or_none()

    # --- quotations ---
    def add_quotation(self, quotation: Quotation) -> None:
        self.db.add(quotation)

    async def get_quotation(self, quotation_id: uuid.UUID) -> Quotation | None:
        result = await self.db.execute(
            select(Quotation).where(Quotation.id == quotation_id).options(selectinload(Quotation.items))
        )
        return result.scalar_one_or_none()

    async def list_quotations(self, vendor_id: uuid.UUID | None = None) -> list[Quotation]:
        stmt = select(Quotation).options(selectinload(Quotation.items)).order_by(Quotation.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(Quotation.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- sales invoices ---
    def add_sales_invoice(self, invoice: SalesInvoice) -> None:
        self.db.add(invoice)

    async def get_sales_invoice(self, invoice_id: uuid.UUID) -> SalesInvoice | None:
        result = await self.db.execute(
            select(SalesInvoice).where(SalesInvoice.id == invoice_id).options(selectinload(SalesInvoice.items))
        )
        return result.scalar_one_or_none()

    async def list_sales_invoices(self, vendor_id: uuid.UUID | None = None) -> list[SalesInvoice]:
        stmt = (
            select(SalesInvoice)
            .options(selectinload(SalesInvoice.items))
            .order_by(SalesInvoice.created_at.desc())
        )
        if vendor_id is not None:
            stmt = stmt.where(SalesInvoice.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- payments in ---
    def add_payment_in(self, payment: PaymentIn) -> None:
        self.db.add(payment)

    async def get_payment_in(self, payment_id: uuid.UUID) -> PaymentIn | None:
        result = await self.db.execute(
            select(PaymentIn).where(PaymentIn.id == payment_id).options(selectinload(PaymentIn.allocations))
        )
        return result.scalar_one_or_none()

    async def list_payments_in(self, vendor_id: uuid.UUID | None = None) -> list[PaymentIn]:
        stmt = select(PaymentIn).options(selectinload(PaymentIn.allocations)).order_by(PaymentIn.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(PaymentIn.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- sales returns ---
    def add_sales_return(self, sales_return: SalesReturn) -> None:
        self.db.add(sales_return)

    async def get_sales_return_by_number(self, return_number: str) -> SalesReturn | None:
        result = await self.db.execute(select(SalesReturn).where(SalesReturn.return_number == return_number))
        return result.scalar_one_or_none()

    async def list_sales_returns(self, vendor_id: uuid.UUID | None = None) -> list[SalesReturn]:
        stmt = (
            select(SalesReturn).options(selectinload(SalesReturn.items)).order_by(SalesReturn.created_at.desc())
        )
        if vendor_id is not None:
            stmt = stmt.where(SalesReturn.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- credit notes ---
    def add_credit_note(self, credit_note: CreditNote) -> None:
        self.db.add(credit_note)

    async def get_credit_note_by_number(self, credit_note_number: str) -> CreditNote | None:
        result = await self.db.execute(
            select(CreditNote).where(CreditNote.credit_note_number == credit_note_number)
        )
        return result.scalar_one_or_none()

    async def list_credit_notes(self, vendor_id: uuid.UUID | None = None) -> list[CreditNote]:
        stmt = select(CreditNote).options(selectinload(CreditNote.items)).order_by(CreditNote.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(CreditNote.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- delivery challans ---
    def add_delivery_challan(self, challan: DeliveryChallan) -> None:
        self.db.add(challan)

    async def get_delivery_challan_by_number(self, challan_number: str) -> DeliveryChallan | None:
        result = await self.db.execute(
            select(DeliveryChallan).where(DeliveryChallan.challan_number == challan_number)
        )
        return result.scalar_one_or_none()

    async def list_delivery_challans(self, vendor_id: uuid.UUID | None = None) -> list[DeliveryChallan]:
        stmt = (
            select(DeliveryChallan)
            .options(selectinload(DeliveryChallan.items))
            .order_by(DeliveryChallan.created_at.desc())
        )
        if vendor_id is not None:
            stmt = stmt.where(DeliveryChallan.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # --- proforma invoices ---
    def add_proforma_invoice(self, proforma: ProformaInvoice) -> None:
        self.db.add(proforma)

    async def get_proforma_invoice_by_number(self, proforma_number: str) -> ProformaInvoice | None:
        result = await self.db.execute(
            select(ProformaInvoice).where(ProformaInvoice.proforma_number == proforma_number)
        )
        return result.scalar_one_or_none()

    async def list_proforma_invoices(self, vendor_id: uuid.UUID | None = None) -> list[ProformaInvoice]:
        stmt = (
            select(ProformaInvoice)
            .options(selectinload(ProformaInvoice.items))
            .order_by(ProformaInvoice.created_at.desc())
        )
        if vendor_id is not None:
            stmt = stmt.where(ProformaInvoice.vendor_id == vendor_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
