import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel, UserRole
from app.models.user import User
from app.repositories.vendor_repository import VendorRepository
from app.schemas.billing import (
    InvoiceGenerateRequest,
    InvoiceResponse,
    PaymentCreateRequest,
    PaymentResponse,
)
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["billing"])

billing_view = require_permission(PermissionFeature.BILLING, PermissionLevel.VIEW)
billing_full = require_permission(PermissionFeature.BILLING, PermissionLevel.FULL)
payments_full = require_permission(PermissionFeature.PAYMENTS, PermissionLevel.FULL)


async def _invoice_response(invoice, db: AsyncSession) -> dict:  # noqa: ANN001
    vendor = await VendorRepository(db).get_by_id(invoice.vendor_id)
    return InvoiceResponse(
        id=invoice.id,
        invoice_no=invoice.invoice_no,
        vendor_id=invoice.vendor_id,
        vendor_name=vendor.name if vendor else "Unknown vendor",
        period_month=invoice.period_month,
        subtotal=invoice.subtotal,
        cgst=invoice.cgst,
        sgst=invoice.sgst,
        total=invoice.total,
        amount_paid=invoice.amount_paid,
        status=invoice.status,
        due_date=invoice.due_date,
        created_at=invoice.created_at,
        created_by=invoice.created_by,
        # Vendors on an agreed credit period are billed on account ("Credit");
        # everyone else is invoiced with payment expected immediately ("Cash").
        invoice_type="Credit" if vendor and vendor.credit_period_days > 0 else "Cash",
        items=list(invoice.items),
    ).model_dump()


@router.get("/invoices")
async def list_invoices(
    vendor_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(billing_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    scope = user.vendor_id if user.role == UserRole.VENDOR else vendor_id
    invoices = await BillingService(db).list_invoices(scope)
    return success_envelope([await _invoice_response(i, db) for i in invoices])


@router.post("/invoices/generate")
async def generate_invoice(
    payload: InvoiceGenerateRequest,
    actor: User = Depends(billing_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoice = await BillingService(db).generate_invoice(payload, actor.full_name)
    return success_envelope(await _invoice_response(invoice, db), "Invoice generated")


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: uuid.UUID,
    _: User = Depends(billing_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoice = await BillingService(db).get_invoice(invoice_id)
    return success_envelope(await _invoice_response(invoice, db))


@router.post("/invoices/{invoice_id}/pay")
async def pay_invoice_full(
    invoice_id: uuid.UUID,
    actor: User = Depends(payments_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoice = await BillingService(db).record_full_payment(invoice_id, actor.full_name, actor.id)
    return success_envelope(await _invoice_response(invoice, db), "Payment recorded")


@router.post("/invoices/{invoice_id}/remind")
async def remind_invoice(
    invoice_id: uuid.UUID,
    actor: User = Depends(billing_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BillingService(db).send_reminder(invoice_id, actor.full_name)
    return success_envelope(None, "WhatsApp reminder sent with UPI payment link")


@router.get("/payments")
async def list_payments(
    vendor_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(billing_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    scope = user.vendor_id if user.role == UserRole.VENDOR else vendor_id
    payments = await BillingService(db).repo.list_payments(scope)
    return success_envelope([PaymentResponse.model_validate(p).model_dump() for p in payments])


@router.post("/payments")
async def record_payment(
    payload: PaymentCreateRequest,
    actor: User = Depends(payments_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payment = await BillingService(db).record_payment(payload, actor.full_name, actor.id)
    return success_envelope(PaymentResponse.model_validate(payment).model_dump(), "Payment recorded")
