import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.enums import (
    DebitNoteStatus,
    LedgerEntryType,
    PurchaseInvoiceStatus,
    PurchaseOrderStatus,
    StockMovementType,
)
from app.models.product import StockMovement
from app.models.purchase import (
    DebitNote,
    DebitNoteItem,
    PaymentOut,
    PaymentOutAllocation,
    PurchaseInvoice,
    PurchaseInvoiceItem,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseReturn,
    PurchaseReturnItem,
)
from app.repositories.product_repository import ProductRepository
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.purchase import (
    DebitNoteCreateRequest,
    PaymentOutCreateRequest,
    PurchaseAdjustmentItemRequest,
    PurchaseInvoiceCreateRequest,
    PurchaseItemRequest,
    PurchaseOrderCreateRequest,
    PurchaseReturnCreateRequest,
)
from app.services.audit_service import AuditService
from app.services.vendor_service import VendorService


class PurchaseService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = PurchaseRepository(db)
        self.vendors = VendorRepository(db)
        self.products = ProductRepository(db)
        self.audit = AuditService(db)

    async def _get_vendor(self, vendor_id: uuid.UUID):
        vendor = await self.vendors.get_by_id(vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")
        return vendor

    # --- Purchase Orders ---

    async def list_purchase_orders(self, vendor_id: uuid.UUID | None = None) -> list[PurchaseOrder]:
        return await self.repo.list_purchase_orders(vendor_id)

    async def get_purchase_order(self, order_id: uuid.UUID) -> PurchaseOrder:
        order = await self.repo.get_purchase_order(order_id)
        if order is None:
            raise NotFoundError("Purchase order not found")
        return order

    async def create_purchase_order(self, data: PurchaseOrderCreateRequest, actor_name: str) -> PurchaseOrder:
        vendor = await self._get_vendor(data.vendor_id)

        if data.po_number:
            if await self.repo.get_purchase_order_by_number(data.po_number) is not None:
                raise ConflictError(f"PO number {data.po_number} is already in use")
            po_number = data.po_number
            await self.repo.reserve_document_number("purchase_order", po_number)
        else:
            po_number = await self.repo.next_document_number("purchase_order")

        order = PurchaseOrder(
            po_number=po_number,
            vendor_id=vendor.id,
            order_date=data.order_date,
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
        subtotal, tax_amount = self._build_priced_items(order.items, data.items, PurchaseOrderItem)
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )

        self.repo.add_purchase_order(order)
        self.audit.log(actor_name, f"created purchase order {order.po_number} for {vendor.name}")
        await self.db.commit()
        return await self.get_purchase_order(order.id)

    async def receive_purchase_order(self, order_id: uuid.UUID, actor_name: str) -> PurchaseOrder:
        order = await self.get_purchase_order(order_id)
        order.status = PurchaseOrderStatus.RECEIVED
        self.audit.log(actor_name, f"marked purchase order {order.po_number} as received")
        await self.db.commit()
        return await self.get_purchase_order(order_id)

    # --- Purchase Invoices ---

    async def list_purchase_invoices(self, vendor_id: uuid.UUID | None = None) -> list[PurchaseInvoice]:
        return await self.repo.list_purchase_invoices(vendor_id)

    async def get_purchase_invoice(self, invoice_id: uuid.UUID) -> PurchaseInvoice:
        invoice = await self.repo.get_purchase_invoice(invoice_id)
        if invoice is None:
            raise NotFoundError("Purchase invoice not found")
        return invoice

    async def create_purchase_invoice(self, data: PurchaseInvoiceCreateRequest, actor_name: str) -> PurchaseInvoice:
        vendor = await self._get_vendor(data.vendor_id)

        if data.invoice_number:
            if await self.repo.get_purchase_invoice_by_number(data.invoice_number) is not None:
                raise ConflictError(f"Invoice number {data.invoice_number} is already in use")
            invoice_number = data.invoice_number
            await self.repo.reserve_document_number("purchase_invoice", invoice_number)
        else:
            invoice_number = await self.repo.next_document_number("purchase_invoice")

        invoice = PurchaseInvoice(
            invoice_number=invoice_number,
            vendor_invoice_number=data.vendor_invoice_number,
            vendor_id=vendor.id,
            purchase_order_id=data.purchase_order_id,
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
        subtotal, tax_amount = self._build_priced_items(invoice.items, data.items, PurchaseInvoiceItem)
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
            PurchaseInvoiceStatus.PAID
            if invoice.amount_paid >= invoice.total_amount
            else PurchaseInvoiceStatus.PARTIAL
            if invoice.amount_paid > 0
            else PurchaseInvoiceStatus.UNPAID
        )

        self.repo.add_purchase_invoice(invoice)
        await self.db.flush()

        for item in invoice.items:
            if item.product_id is not None:
                await self._apply_stock_movement(
                    item.product_id, item.quantity, StockMovementType.PURCHASE, "purchase_invoice", invoice.id, None
                )

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.PURCHASE_INVOICE,
            f"Purchase invoice {invoice.invoice_number}",
            credit=invoice.total_amount,
            reference_type="purchase_invoice",
            reference_id=invoice.id,
            reference_number=invoice.invoice_number,
            status=invoice.status.value,
            tds_deducted_by_self=invoice.tds_amount,
        )

        self.audit.log(actor_name, f"recorded purchase invoice {invoice.invoice_number} from {vendor.name}")
        await self.db.commit()
        return await self.get_purchase_invoice(invoice.id)

    # --- Payments Out ---

    async def list_payments_out(self, vendor_id: uuid.UUID | None = None) -> list[PaymentOut]:
        return await self.repo.list_payments_out(vendor_id)

    async def create_payment_out(
        self, data: PaymentOutCreateRequest, actor_name: str, actor_id: uuid.UUID
    ) -> PaymentOut:
        vendor = await self._get_vendor(data.vendor_id)

        allocated_total = sum((a.amount + a.discount for a in data.allocations), Decimal("0"))
        if allocated_total > data.amount + data.discount_amount:
            raise ConflictError("Allocated amount cannot exceed the amount paid plus discount")

        if data.payment_number:
            if await self.repo.get_payment_out_by_number(data.payment_number) is not None:
                raise ConflictError(f"Payment number {data.payment_number} is already in use")
            payment_number = data.payment_number
            await self.repo.reserve_document_number("payment_out", payment_number)
        else:
            payment_number = await self.repo.next_document_number("payment_out")

        payment = PaymentOut(
            payment_number=payment_number,
            vendor_id=vendor.id,
            purchase_invoice_id=data.allocations[0].purchase_invoice_id if len(data.allocations) == 1 else None,
            amount=data.amount,
            discount_amount=data.discount_amount,
            payment_date=data.payment_date,
            method=data.method,
            reference=data.reference,
            notes=data.notes,
            created_by=actor_id,
        )
        self.repo.add_payment_out(payment)
        await self.db.flush()

        for allocation in data.allocations:
            invoice = await self.get_purchase_invoice(allocation.purchase_invoice_id)
            if invoice.vendor_id != vendor.id:
                raise ConflictError(f"Invoice {invoice.invoice_number} does not belong to this party")
            self.db.add(
                PaymentOutAllocation(
                    payment_out_id=payment.id,
                    purchase_invoice_id=invoice.id,
                    amount=allocation.amount,
                    discount=allocation.discount,
                )
            )
            invoice.amount_paid += allocation.amount + allocation.discount
            invoice.status = (
                PurchaseInvoiceStatus.PAID
                if invoice.amount_paid >= invoice.total_amount
                else PurchaseInvoiceStatus.PARTIAL
            )

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.PAYMENT_OUT,
            f"Payment out — {data.method.value.upper()}",
            debit=data.amount,
            reference_type="payment_out",
            reference_id=payment.id,
            reference_number=payment.payment_number,
            status="paid",
            created_by=actor_id,
        )

        self.audit.log(actor_name, f"recorded payment out to {vendor.name}", entity_type="vendor", entity_id=vendor.id)
        await self.db.commit()
        return await self.repo.get_payment_out(payment.id)

    # --- Purchase Returns ---

    async def list_purchase_returns(self, vendor_id: uuid.UUID | None = None) -> list[PurchaseReturn]:
        return await self.repo.list_purchase_returns(vendor_id)

    async def create_purchase_return(
        self, data: PurchaseReturnCreateRequest, actor_name: str
    ) -> PurchaseReturn:
        vendor = await self._get_vendor(data.vendor_id)

        if data.return_number:
            if await self.repo.get_purchase_return_by_number(data.return_number) is not None:
                raise ConflictError(f"Return number {data.return_number} is already in use")
            return_number = data.return_number
            await self.repo.reserve_document_number("purchase_return", return_number)
        else:
            return_number = await self.repo.next_document_number("purchase_return")

        purchase_return = PurchaseReturn(
            return_number=return_number,
            vendor_id=vendor.id,
            purchase_invoice_id=data.purchase_invoice_id,
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
        subtotal, tax_amount = self._build_adjustment_items(purchase_return.items, data.items, PurchaseReturnItem)
        purchase_return.subtotal = subtotal
        purchase_return.tax_amount = tax_amount
        purchase_return.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )

        self.repo.add_purchase_return(purchase_return)
        await self.db.flush()

        for item in purchase_return.items:
            if item.product_id is not None:
                await self._apply_stock_movement(
                    item.product_id,
                    -item.quantity,
                    StockMovementType.ADJUSTMENT,
                    "purchase_return",
                    purchase_return.id,
                    "Purchase return",
                )

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.PURCHASE_RETURN,
            f"Purchase return {purchase_return.return_number}",
            debit=purchase_return.total_amount,
            reference_type="purchase_return",
            reference_id=purchase_return.id,
            reference_number=purchase_return.return_number,
            status=purchase_return.status.value,
        )

        self.audit.log(actor_name, f"recorded purchase return {purchase_return.return_number} to {vendor.name}")
        await self.db.commit()
        return purchase_return

    # --- Debit Notes ---

    async def list_debit_notes(self, vendor_id: uuid.UUID | None = None) -> list[DebitNote]:
        return await self.repo.list_debit_notes(vendor_id)

    async def create_debit_note(self, data: DebitNoteCreateRequest, actor_name: str) -> DebitNote:
        vendor = await self._get_vendor(data.vendor_id)

        if data.debit_note_number:
            if await self.repo.get_debit_note_by_number(data.debit_note_number) is not None:
                raise ConflictError(f"Debit note number {data.debit_note_number} is already in use")
            debit_note_number = data.debit_note_number
            await self.repo.reserve_document_number("debit_note", debit_note_number)
        else:
            debit_note_number = await self.repo.next_document_number("debit_note")

        debit_note = DebitNote(
            debit_note_number=debit_note_number,
            vendor_id=vendor.id,
            purchase_invoice_id=data.purchase_invoice_id,
            purchase_return_id=data.purchase_return_id,
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
            status=DebitNoteStatus.COMPLETED,
        )
        subtotal, tax_amount = self._build_adjustment_items(debit_note.items, data.items, DebitNoteItem)
        debit_note.subtotal = subtotal
        debit_note.tax_amount = tax_amount
        debit_note.total_amount = (
            subtotal
            - data.discount_amount
            + data.additional_charges
            + tax_amount
            - data.tds_amount
            + data.tcs_amount
            + data.round_off
        )

        self.repo.add_debit_note(debit_note)
        await self.db.flush()

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.DEBIT_NOTE,
            f"Debit note {debit_note.debit_note_number}",
            debit=debit_note.total_amount,
            reference_type="debit_note",
            reference_id=debit_note.id,
            reference_number=debit_note.debit_note_number,
            status=debit_note.status.value,
        )

        self.audit.log(actor_name, f"recorded debit note {debit_note.debit_note_number} to {vendor.name}")
        await self.db.commit()
        return debit_note

    # --- shared helpers ---

    def _build_priced_items(
        self,
        target: list,
        items: list[PurchaseItemRequest],
        item_cls: type[PurchaseOrderItem] | type[PurchaseInvoiceItem],
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
        items: list[PurchaseAdjustmentItemRequest],
        item_cls: type[PurchaseReturnItem] | type[DebitNoteItem],
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
