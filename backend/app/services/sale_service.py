import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.enums import LedgerEntryType, SalesInvoiceStatus, StockMovementType
from app.models.product import StockMovement
from app.models.sale import (
    CreditNote,
    CreditNoteItem,
    DeliveryChallan,
    DeliveryChallanItem,
    PaymentIn,
    PaymentInAllocation,
    ProformaInvoice,
    ProformaInvoiceItem,
    Quotation,
    QuotationItem,
    SalesInvoice,
    SalesInvoiceItem,
    SalesReturn,
    SalesReturnItem,
)
from app.repositories.product_repository import ProductRepository
from app.repositories.sale_repository import SaleRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.sale import (
    CreditNoteCreateRequest,
    DeliveryChallanCreateRequest,
    PaymentInCreateRequest,
    ProformaInvoiceCreateRequest,
    QuotationCreateRequest,
    SalesAdjustmentItemRequest,
    SalesInvoiceCreateRequest,
    SalesItemRequest,
    SalesReturnCreateRequest,
)
from app.services.audit_service import AuditService
from app.services.vendor_service import VendorService


class SaleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = SaleRepository(db)
        self.vendors = VendorRepository(db)
        self.products = ProductRepository(db)
        self.audit = AuditService(db)

    async def _get_vendor(self, vendor_id: uuid.UUID):
        vendor = await self.vendors.get_by_id(vendor_id)
        if vendor is None:
            raise NotFoundError("Customer not found")
        return vendor

    # --- Quotations ---

    async def list_quotations(self, vendor_id: uuid.UUID | None = None) -> list[Quotation]:
        return await self.repo.list_quotations(vendor_id)

    async def get_quotation(self, quotation_id: uuid.UUID) -> Quotation:
        quotation = await self.repo.get_quotation(quotation_id)
        if quotation is None:
            raise NotFoundError("Quotation not found")
        return quotation

    async def create_quotation(self, data: QuotationCreateRequest, actor_name: str) -> Quotation:
        vendor = await self._get_vendor(data.vendor_id)

        quotation = Quotation(
            quote_number=await self.repo.next_document_number("quotation"),
            vendor_id=vendor.id,
            quote_date=data.quote_date,
            valid_till=data.valid_till,
            notes=data.notes,
            discount_amount=data.discount_amount,
            round_off=data.round_off,
            created_by=actor_name,
        )
        subtotal, tax_amount = self._build_priced_items(quotation.items, data.items, QuotationItem)
        quotation.subtotal = subtotal
        quotation.tax_amount = tax_amount
        quotation.total_amount = subtotal - data.discount_amount + tax_amount + data.round_off

        self.repo.add_quotation(quotation)
        self.audit.log(actor_name, f"created quotation {quotation.quote_number} for {vendor.name}")
        await self.db.commit()
        return await self.get_quotation(quotation.id)

    # --- Sales Invoices ---

    async def list_sales_invoices(self, vendor_id: uuid.UUID | None = None) -> list[SalesInvoice]:
        return await self.repo.list_sales_invoices(vendor_id)

    async def get_sales_invoice(self, invoice_id: uuid.UUID) -> SalesInvoice:
        invoice = await self.repo.get_sales_invoice(invoice_id)
        if invoice is None:
            raise NotFoundError("Sales invoice not found")
        return invoice

    async def create_sales_invoice(self, data: SalesInvoiceCreateRequest, actor_name: str) -> SalesInvoice:
        vendor = await self._get_vendor(data.vendor_id)

        if data.invoice_number:
            if await self.repo.get_sales_invoice_by_number(data.invoice_number) is not None:
                raise ConflictError(f"Invoice number {data.invoice_number} is already in use")
            invoice_number = data.invoice_number
            await self.repo.reserve_document_number("sales_invoice", invoice_number)
        else:
            invoice_number = await self.repo.next_document_number("sales_invoice")

        invoice = SalesInvoice(
            invoice_number=invoice_number,
            vendor_id=vendor.id,
            quotation_id=data.quotation_id,
            invoice_date=data.invoice_date,
            due_date=data.due_date,
            payment_terms=data.payment_terms,
            notes=data.notes,
            terms_and_conditions=data.terms_and_conditions,
            discount_amount=data.discount_amount,
            additional_charges=data.additional_charges,
            tds_amount=data.tds_amount,
            tcs_amount=data.tcs_amount,
            round_off=data.round_off,
            amount_paid=data.amount_paid,
            authorized_signatory_name=data.authorized_signatory_name,
            authorized_signatory_signature_url=data.authorized_signatory_signature_url,
            created_by=actor_name,
        )
        subtotal, tax_amount = self._build_priced_items(invoice.items, data.items, SalesInvoiceItem)
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )
        invoice.status = (
            SalesInvoiceStatus.PAID
            if invoice.amount_paid >= invoice.total_amount
            else SalesInvoiceStatus.PARTIAL
            if invoice.amount_paid > 0
            else SalesInvoiceStatus.UNPAID
        )

        self.repo.add_sales_invoice(invoice)
        await self.db.flush()

        for item in invoice.items:
            if item.product_id is not None:
                await self._apply_stock_movement(
                    item.product_id, -item.quantity, StockMovementType.SALE_DISPATCH, "sales_invoice", invoice.id, None
                )

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.SALES_INVOICE,
            f"Sales invoice {invoice.invoice_number}",
            debit=invoice.total_amount,
            reference_type="sales_invoice",
            reference_id=invoice.id,
            reference_number=invoice.invoice_number,
            status=invoice.status.value,
            tds_deducted_by_party=invoice.tds_amount,
        )

        self.audit.log(actor_name, f"recorded sales invoice {invoice.invoice_number} for {vendor.name}")
        await self.db.commit()
        return await self.get_sales_invoice(invoice.id)

    async def cancel_sales_invoice(self, invoice_id: uuid.UUID, actor_name: str) -> SalesInvoice:
        invoice = await self.get_sales_invoice(invoice_id)
        if invoice.amount_paid > 0:
            raise ConflictError("Cannot cancel an invoice that already has payments recorded against it")
        invoice.status = SalesInvoiceStatus.CANCELLED
        self.audit.log(actor_name, f"cancelled sales invoice {invoice.invoice_number}")
        await self.db.commit()
        return await self.get_sales_invoice(invoice_id)

    # --- Payments In ---

    async def list_payments_in(self, vendor_id: uuid.UUID | None = None) -> list[PaymentIn]:
        return await self.repo.list_payments_in(vendor_id)

    async def create_payment_in(
        self, data: PaymentInCreateRequest, actor_name: str, actor_id: uuid.UUID
    ) -> PaymentIn:
        vendor = await self._get_vendor(data.vendor_id)

        allocated_total = sum((a.amount + a.discount for a in data.allocations), Decimal("0"))
        if allocated_total > data.amount + data.discount_amount:
            raise ConflictError("Allocated amount cannot exceed the amount received plus discount")

        if data.payment_number:
            if await self.repo.get_payment_in_by_number(data.payment_number) is not None:
                raise ConflictError(f"Payment number {data.payment_number} is already in use")
            payment_number = data.payment_number
            await self.repo.reserve_document_number("payment_in", payment_number)
        else:
            payment_number = await self.repo.next_document_number("payment_in")

        payment = PaymentIn(
            payment_number=payment_number,
            vendor_id=vendor.id,
            sales_invoice_id=data.allocations[0].sales_invoice_id if len(data.allocations) == 1 else None,
            amount=data.amount,
            discount_amount=data.discount_amount,
            payment_date=data.payment_date,
            method=data.method,
            reference=data.reference,
            notes=data.notes,
            created_by=actor_id,
        )
        self.repo.add_payment_in(payment)
        await self.db.flush()

        for allocation in data.allocations:
            invoice = await self.get_sales_invoice(allocation.sales_invoice_id)
            if invoice.vendor_id != vendor.id:
                raise ConflictError(f"Invoice {invoice.invoice_number} does not belong to this party")
            self.db.add(
                PaymentInAllocation(
                    payment_in_id=payment.id,
                    sales_invoice_id=invoice.id,
                    amount=allocation.amount,
                    discount=allocation.discount,
                )
            )
            invoice.amount_paid += allocation.amount + allocation.discount
            invoice.status = (
                SalesInvoiceStatus.PAID
                if invoice.amount_paid >= invoice.total_amount
                else SalesInvoiceStatus.PARTIAL
            )

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.PAYMENT_IN,
            f"Payment in — {data.method.value.upper()}",
            credit=data.amount,
            reference_type="payment_in",
            reference_id=payment.id,
            reference_number=payment.payment_number,
            status="paid",
            created_by=actor_id,
        )

        self.audit.log(actor_name, f"recorded payment in from {vendor.name}", entity_type="vendor", entity_id=vendor.id)
        await self.db.commit()
        return await self.repo.get_payment_in(payment.id)

    # --- Sales Returns ---

    async def list_sales_returns(self, vendor_id: uuid.UUID | None = None) -> list[SalesReturn]:
        return await self.repo.list_sales_returns(vendor_id)

    async def create_sales_return(self, data: SalesReturnCreateRequest, actor_name: str) -> SalesReturn:
        vendor = await self._get_vendor(data.vendor_id)

        if data.return_number:
            if await self.repo.get_sales_return_by_number(data.return_number) is not None:
                raise ConflictError(f"Return number {data.return_number} is already in use")
            return_number = data.return_number
            await self.repo.reserve_document_number("sales_return", return_number)
        else:
            return_number = await self.repo.next_document_number("sales_return")

        sales_return = SalesReturn(
            return_number=return_number,
            vendor_id=vendor.id,
            sales_invoice_id=data.sales_invoice_id,
            return_date=data.return_date,
            due_in=data.due_in,
            payment_terms=data.payment_terms,
            notes=data.notes,
            terms_and_conditions=data.terms_and_conditions,
            discount_amount=data.discount_amount,
            additional_charges=data.additional_charges,
            tds_amount=data.tds_amount,
            tcs_amount=data.tcs_amount,
            round_off=data.round_off,
            amount_paid=data.amount_paid,
            authorized_signatory_name=data.authorized_signatory_name,
            authorized_signatory_signature_url=data.authorized_signatory_signature_url,
            created_by=actor_name,
        )
        subtotal, tax_amount = self._build_adjustment_items(sales_return.items, data.items, SalesReturnItem)
        sales_return.subtotal = subtotal
        sales_return.tax_amount = tax_amount
        sales_return.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )

        self.repo.add_sales_return(sales_return)
        await self.db.flush()

        for item in sales_return.items:
            if item.product_id is not None:
                await self._apply_stock_movement(
                    item.product_id,
                    item.quantity,
                    StockMovementType.ADJUSTMENT,
                    "sales_return",
                    sales_return.id,
                    "Sales return",
                )

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.SALES_RETURN,
            f"Sales return {sales_return.return_number}",
            credit=sales_return.total_amount,
            reference_type="sales_return",
            reference_id=sales_return.id,
            reference_number=sales_return.return_number,
            status=sales_return.status.value,
        )

        self.audit.log(actor_name, f"recorded sales return {sales_return.return_number} from {vendor.name}")
        await self.db.commit()
        return sales_return

    # --- Credit Notes ---

    async def list_credit_notes(self, vendor_id: uuid.UUID | None = None) -> list[CreditNote]:
        return await self.repo.list_credit_notes(vendor_id)

    async def create_credit_note(self, data: CreditNoteCreateRequest, actor_name: str) -> CreditNote:
        vendor = await self._get_vendor(data.vendor_id)

        if data.credit_note_number:
            if await self.repo.get_credit_note_by_number(data.credit_note_number) is not None:
                raise ConflictError(f"Credit note number {data.credit_note_number} is already in use")
            credit_note_number = data.credit_note_number
            await self.repo.reserve_document_number("credit_note", credit_note_number)
        else:
            credit_note_number = await self.repo.next_document_number("credit_note")

        credit_note = CreditNote(
            credit_note_number=credit_note_number,
            vendor_id=vendor.id,
            sales_invoice_id=data.sales_invoice_id,
            sales_return_id=data.sales_return_id,
            note_date=data.note_date,
            payment_terms=data.payment_terms,
            notes=data.notes,
            terms_and_conditions=data.terms_and_conditions,
            discount_amount=data.discount_amount,
            additional_charges=data.additional_charges,
            tds_amount=data.tds_amount,
            tcs_amount=data.tcs_amount,
            round_off=data.round_off,
            amount_paid=data.amount_paid,
            authorized_signatory_name=data.authorized_signatory_name,
            authorized_signatory_signature_url=data.authorized_signatory_signature_url,
            created_by=actor_name,
        )
        subtotal, tax_amount = self._build_adjustment_items(credit_note.items, data.items, CreditNoteItem)
        credit_note.subtotal = subtotal
        credit_note.tax_amount = tax_amount
        credit_note.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )

        self.repo.add_credit_note(credit_note)
        await self.db.flush()

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.CREDIT_NOTE,
            f"Credit note {credit_note.credit_note_number}",
            credit=credit_note.total_amount,
            reference_type="credit_note",
            reference_id=credit_note.id,
            reference_number=credit_note.credit_note_number,
            status=credit_note.status.value,
        )

        self.audit.log(actor_name, f"recorded credit note {credit_note.credit_note_number} for {vendor.name}")
        await self.db.commit()
        return credit_note

    # --- Delivery Challans ---

    async def list_delivery_challans(self, vendor_id: uuid.UUID | None = None) -> list[DeliveryChallan]:
        return await self.repo.list_delivery_challans(vendor_id)

    async def create_delivery_challan(self, data: DeliveryChallanCreateRequest, actor_name: str) -> DeliveryChallan:
        vendor = await self._get_vendor(data.vendor_id)

        if data.challan_number:
            if await self.repo.get_delivery_challan_by_number(data.challan_number) is not None:
                raise ConflictError(f"Challan number {data.challan_number} is already in use")
            challan_number = data.challan_number
            await self.repo.reserve_document_number("delivery_challan", challan_number)
        else:
            challan_number = await self.repo.next_document_number("delivery_challan")

        challan = DeliveryChallan(
            challan_number=challan_number,
            vendor_id=vendor.id,
            quotation_id=data.quotation_id,
            challan_date=data.challan_date,
            payment_terms=data.payment_terms,
            notes=data.notes,
            terms_and_conditions=data.terms_and_conditions,
            discount_amount=data.discount_amount,
            additional_charges=data.additional_charges,
            tds_amount=data.tds_amount,
            tcs_amount=data.tcs_amount,
            round_off=data.round_off,
            amount_paid=data.amount_paid,
            authorized_signatory_name=data.authorized_signatory_name,
            authorized_signatory_signature_url=data.authorized_signatory_signature_url,
            created_by=actor_name,
        )
        subtotal, tax_amount = self._build_priced_items(challan.items, data.items, DeliveryChallanItem)
        challan.subtotal = subtotal
        challan.tax_amount = tax_amount
        challan.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )

        self.repo.add_delivery_challan(challan)
        await self.db.flush()

        for item in challan.items:
            if item.product_id is not None:
                await self._apply_stock_movement(
                    item.product_id,
                    -item.quantity,
                    StockMovementType.SALE_DISPATCH,
                    "delivery_challan",
                    challan.id,
                    "Delivery challan",
                )

        self.audit.log(actor_name, f"recorded delivery challan {challan.challan_number} for {vendor.name}")
        await self.db.commit()
        return challan

    # --- Proforma Invoices ---

    async def list_proforma_invoices(self, vendor_id: uuid.UUID | None = None) -> list[ProformaInvoice]:
        return await self.repo.list_proforma_invoices(vendor_id)

    async def create_proforma_invoice(self, data: ProformaInvoiceCreateRequest, actor_name: str) -> ProformaInvoice:
        vendor = await self._get_vendor(data.vendor_id)

        if data.proforma_number:
            if await self.repo.get_proforma_invoice_by_number(data.proforma_number) is not None:
                raise ConflictError(f"Proforma number {data.proforma_number} is already in use")
            proforma_number = data.proforma_number
            await self.repo.reserve_document_number("proforma_invoice", proforma_number)
        else:
            proforma_number = await self.repo.next_document_number("proforma_invoice")

        proforma = ProformaInvoice(
            proforma_number=proforma_number,
            vendor_id=vendor.id,
            quotation_id=data.quotation_id,
            proforma_date=data.proforma_date,
            valid_till=data.valid_till,
            payment_terms=data.payment_terms,
            notes=data.notes,
            terms_and_conditions=data.terms_and_conditions,
            discount_amount=data.discount_amount,
            additional_charges=data.additional_charges,
            tds_amount=data.tds_amount,
            tcs_amount=data.tcs_amount,
            round_off=data.round_off,
            amount_paid=data.amount_paid,
            authorized_signatory_name=data.authorized_signatory_name,
            authorized_signatory_signature_url=data.authorized_signatory_signature_url,
            created_by=actor_name,
        )
        subtotal, tax_amount = self._build_priced_items(proforma.items, data.items, ProformaInvoiceItem)
        proforma.subtotal = subtotal
        proforma.tax_amount = tax_amount
        proforma.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )

        self.repo.add_proforma_invoice(proforma)
        self.audit.log(actor_name, f"created proforma invoice {proforma.proforma_number} for {vendor.name}")
        await self.db.commit()
        return proforma

    # --- shared helpers ---

    def _build_priced_items(
        self,
        target: list,
        items: list[SalesItemRequest],
        item_cls: type[QuotationItem]
        | type[SalesInvoiceItem]
        | type[DeliveryChallanItem]
        | type[ProformaInvoiceItem],
    ) -> tuple[Decimal, Decimal]:
        subtotal = Decimal("0")
        tax_amount = Decimal("0")
        for item in items:
            line_base = (item.rate * item.quantity) * (1 - item.discount_percent / 100)
            line_tax = line_base * item.tax_percent / 100
            amount = (line_base + line_tax).quantize(Decimal("0.01"))
            subtotal += line_base
            tax_amount += line_tax
            target.append(
                item_cls(
                    product_id=item.product_id,
                    description=item.description,
                    hsn_code=item.hsn_code,
                    quantity=item.quantity,
                    rate=item.rate,
                    discount_percent=item.discount_percent,
                    tax_percent=item.tax_percent,
                    amount=amount,
                )
            )
        return subtotal.quantize(Decimal("0.01")), tax_amount.quantize(Decimal("0.01"))

    def _build_adjustment_items(
        self,
        target: list,
        items: list[SalesAdjustmentItemRequest],
        item_cls: type[SalesReturnItem] | type[CreditNoteItem],
    ) -> tuple[Decimal, Decimal]:
        subtotal = Decimal("0")
        tax_amount = Decimal("0")
        for item in items:
            line_base = item.rate * item.quantity
            line_tax = line_base * item.tax_percent / 100
            amount = (line_base + line_tax).quantize(Decimal("0.01"))
            subtotal += line_base
            tax_amount += line_tax
            target.append(
                item_cls(
                    product_id=item.product_id,
                    description=item.description,
                    hsn_code=item.hsn_code,
                    quantity=item.quantity,
                    rate=item.rate,
                    tax_percent=item.tax_percent,
                    amount=amount,
                )
            )
        return subtotal.quantize(Decimal("0.01")), tax_amount.quantize(Decimal("0.01"))

    async def _apply_stock_movement(
        self,
        product_id: uuid.UUID,
        quantity_delta: int,
        movement_type: StockMovementType,
        reference_type: str,
        reference_id: uuid.UUID,
        note: str | None,
    ) -> None:
        product = await self.products.get_by_id(product_id)
        if product is None:
            return
        product.current_stock += quantity_delta
        self.products.add_movement(
            StockMovement(
                product_id=product_id,
                movement_type=movement_type,
                quantity_delta=quantity_delta,
                note=note,
                reference_type=reference_type,
                reference_id=reference_id,
            )
        )
