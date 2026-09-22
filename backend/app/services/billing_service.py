import calendar
import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.billing import Invoice, InvoiceItem, Payment
from app.models.enums import InvoiceStatus, LedgerEntryType, PaymentMethod, PaymentStatus
from app.repositories.billing_repository import BillingRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.billing import InvoiceGenerateRequest, PaymentCreateRequest
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.vendor_service import VendorService


class BillingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BillingRepository(db)
        self.vendors = VendorRepository(db)
        self.products = ProductRepository(db)
        self.audit = AuditService(db)
        self.notifications = NotificationService()

    async def list_invoices(self, vendor_id: uuid.UUID | None = None) -> list[Invoice]:
        return await self.repo.list_invoices(vendor_id)

    async def get_invoice(self, invoice_id: uuid.UUID) -> Invoice:
        invoice = await self.repo.get_invoice(invoice_id)
        if invoice is None:
            raise NotFoundError("Invoice not found")
        return invoice

    async def generate_invoice(self, data: InvoiceGenerateRequest, actor_name: str) -> Invoice:
        vendor = await self.vendors.get_by_id(data.vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")

        period_start = data.period_month.replace(day=1)
        last_day = calendar.monthrange(period_start.year, period_start.month)[1]
        period_end = period_start.replace(day=last_day)

        orders = await self.repo.get_uninvoiced_delivered_orders(vendor.id, period_start, period_end)
        if not orders:
            raise BusinessRuleError("No uninvoiced delivered orders found for this vendor in this period")

        # Due date follows the vendor's agreed credit period from the billing
        # period's end; vendors with no credit period fall back to the 10th of
        # the following month.
        if vendor.credit_period_days > 0:
            due_date = period_end + timedelta(days=vendor.credit_period_days)
        else:
            due_date = (period_end + timedelta(days=1)).replace(day=1) + timedelta(days=9)

        invoice = Invoice(
            invoice_no=await self.repo.next_invoice_no(),
            vendor_id=vendor.id,
            period_month=period_start,
            subtotal=Decimal("0"),
            cgst=Decimal("0"),
            sgst=Decimal("0"),
            total=Decimal("0"),
            due_date=due_date,
            created_by=actor_name,
        )

        subtotal = Decimal("0")
        # Aggregate order items per product so the invoice shows one line per SKU.
        lines: dict[uuid.UUID, dict] = {}
        for order in orders:
            for item in order.items:
                line = lines.setdefault(
                    item.product_id,
                    {"quantity": 0, "rate": item.rate_snapshot, "amount": Decimal("0")},
                )
                line["quantity"] += item.quantity
                line["amount"] += item.rate_snapshot * item.quantity
                subtotal += item.rate_snapshot * item.quantity

        cgst = (subtotal * settings.DEFAULT_CGST_PERCENT / 100).quantize(Decimal("0.01"))
        sgst = (subtotal * settings.DEFAULT_SGST_PERCENT / 100).quantize(Decimal("0.01"))
        invoice.subtotal = subtotal
        invoice.cgst = cgst
        invoice.sgst = sgst
        invoice.total = subtotal + cgst + sgst

        for product_id, line in lines.items():
            product = await self.products.get_by_id(product_id)
            invoice.items.append(
                InvoiceItem(
                    product_id=product_id,
                    description=product.name if product else "Product",
                    hsn_code=product.hsn_code if product else "",
                    rate=line["rate"],
                    quantity=line["quantity"],
                    amount=line["amount"],
                )
            )

        self.repo.add_invoice(invoice)
        await self.db.flush()

        for order in orders:
            order.invoice_id = invoice.id

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.INVOICE,
            f"Invoice {invoice.invoice_no}",
            debit=invoice.total,
            reference_type="invoice",
            reference_id=invoice.id,
            reference_number=invoice.invoice_no,
            status=invoice.status.value,
        )

        self.audit.log(actor_name, f"generated invoice {invoice.invoice_no} for {vendor.name}")
        await self.db.commit()
        return await self.get_invoice(invoice.id)

    async def record_payment(self, data: PaymentCreateRequest, actor_name: str, actor_id: uuid.UUID) -> Payment:
        vendor = await self.vendors.get_by_id(data.vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")

        payment = Payment(
            vendor_id=vendor.id,
            invoice_id=data.invoice_id,
            order_id=data.order_id,
            amount=data.amount,
            tds_amount=data.tds_amount,
            method=data.method,
            status=PaymentStatus.COMPLETED,
            reference=data.reference,
            recorded_by=actor_id,
        )
        self.repo.add_payment(payment)

        settled = data.amount + data.tds_amount
        invoice = None
        if data.invoice_id is not None:
            invoice = await self.get_invoice(data.invoice_id)
            invoice.amount_paid += settled
            invoice.status = (
                InvoiceStatus.PAID if invoice.amount_paid >= invoice.total else InvoiceStatus.PARTIAL
            )

        vendor_service = VendorService(self.db)
        await vendor_service.post_ledger_entry(
            vendor,
            LedgerEntryType.PAYMENT,
            f"Payment received — {data.method.value.upper()}",
            credit=settled,
            reference_type="invoice" if invoice else "order",
            reference_id=invoice.id if invoice else data.order_id,
            reference_number=invoice.invoice_no if invoice else None,
            status=invoice.status.value if invoice else "paid",
            tds_deducted_by_party=data.tds_amount,
            created_by=actor_id,
        )

        target = invoice.invoice_no if invoice else vendor.name
        prefix = "recorded full payment for" if invoice and invoice.status == InvoiceStatus.PAID else "recorded payment for"
        self.audit.log(actor_name, f"{prefix} {target}", entity_type="vendor", entity_id=vendor.id)
        await self.db.commit()
        return payment

    async def record_full_payment(self, invoice_id: uuid.UUID, actor_name: str, actor_id: uuid.UUID) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        remaining = invoice.total - invoice.amount_paid
        if remaining <= 0:
            return invoice
        await self.record_payment(
            PaymentCreateRequest(vendor_id=invoice.vendor_id, invoice_id=invoice.id, amount=remaining, method=PaymentMethod.UPI),
            actor_name,
            actor_id,
        )
        return await self.get_invoice(invoice_id)

    async def send_reminder(self, invoice_id: uuid.UUID, actor_name: str) -> None:
        invoice = await self.get_invoice(invoice_id)
        vendor = await self.vendors.get_by_id(invoice.vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")
        await self.notifications.send_payment_reminder(
            vendor.name, vendor.phone, str(invoice.total - invoice.amount_paid), "upi://pay?pa=kshirsagardairy@upi"
        )
        self.audit.log(actor_name, f"sent WhatsApp payment reminder for {invoice.invoice_no}")
        await self.db.commit()
