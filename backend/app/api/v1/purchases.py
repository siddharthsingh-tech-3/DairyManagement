import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.purchase import DebitNote, PaymentOut, PurchaseInvoice, PurchaseOrder, PurchaseReturn
from app.models.user import User
from app.repositories.purchase_repository import PurchaseRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.purchase import (
    DebitNoteCreateRequest,
    DebitNoteResponse,
    PaymentOutAllocationResponse,
    PaymentOutCreateRequest,
    PaymentOutResponse,
    PurchaseInvoiceCreateRequest,
    PurchaseInvoiceResponse,
    PurchaseOrderCreateRequest,
    PurchaseOrderResponse,
    PurchaseReturnCreateRequest,
    PurchaseReturnResponse,
)
from app.services.purchase_service import PurchaseService

router = APIRouter(prefix="/purchases", tags=["purchases"])

purchases_view = require_permission(PermissionFeature.PURCHASES, PermissionLevel.VIEW)
purchases_full = require_permission(PermissionFeature.PURCHASES, PermissionLevel.FULL)


async def _vendor_name(vendor_id: uuid.UUID, db: AsyncSession) -> str:
    vendor = await VendorRepository(db).get_by_id(vendor_id)
    return vendor.name if vendor else "Unknown vendor"


async def _order_response(order: PurchaseOrder, db: AsyncSession) -> dict:
    return PurchaseOrderResponse(
        id=order.id,
        po_number=order.po_number,
        vendor_id=order.vendor_id,
        vendor_name=await _vendor_name(order.vendor_id, db),
        order_date=order.order_date,
        valid_till=order.valid_till,
        status=order.status,
        subtotal=order.subtotal,
        discount_amount=order.discount_amount,
        tax_amount=order.tax_amount,
        round_off=order.round_off,
        total_amount=order.total_amount,
        notes=order.notes,
        created_at=order.created_at,
        created_by=order.created_by,
        items=list(order.items),
    ).model_dump()


async def _invoice_response(invoice: PurchaseInvoice, db: AsyncSession) -> dict:
    return PurchaseInvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        vendor_invoice_number=invoice.vendor_invoice_number,
        vendor_id=invoice.vendor_id,
        vendor_name=await _vendor_name(invoice.vendor_id, db),
        purchase_order_id=invoice.purchase_order_id,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        subtotal=invoice.subtotal,
        discount_amount=invoice.discount_amount,
        additional_charges=invoice.additional_charges,
        tax_amount=invoice.tax_amount,
        tds_amount=invoice.tds_amount,
        tcs_amount=invoice.tcs_amount,
        round_off=invoice.round_off,
        total_amount=invoice.total_amount,
        amount_paid=invoice.amount_paid,
        payment_terms=invoice.payment_terms,
        terms_and_conditions=invoice.terms_and_conditions,
        authorized_signatory_name=invoice.authorized_signatory_name,
        authorized_signatory_signature_url=invoice.authorized_signatory_signature_url,
        status=invoice.status,
        notes=invoice.notes,
        created_at=invoice.created_at,
        created_by=invoice.created_by,
        items=list(invoice.items),
    ).model_dump()


async def _payment_out_response(payment: PaymentOut, db: AsyncSession) -> dict:
    allocations = []
    for allocation in payment.allocations:
        invoice = await PurchaseRepository(db).get_purchase_invoice(allocation.purchase_invoice_id)
        allocations.append(
            PaymentOutAllocationResponse(
                purchase_invoice_id=allocation.purchase_invoice_id,
                invoice_number=invoice.invoice_number if invoice else "",
                amount=allocation.amount,
                discount=allocation.discount,
            )
        )
    return PaymentOutResponse(
        id=payment.id,
        payment_number=payment.payment_number,
        vendor_id=payment.vendor_id,
        vendor_name=await _vendor_name(payment.vendor_id, db),
        purchase_invoice_id=payment.purchase_invoice_id,
        amount=payment.amount,
        discount_amount=payment.discount_amount,
        payment_date=payment.payment_date,
        method=payment.method,
        reference=payment.reference,
        notes=payment.notes,
        created_at=payment.created_at,
        allocations=allocations,
    ).model_dump()


async def _return_response(purchase_return: PurchaseReturn, db: AsyncSession) -> dict:
    return PurchaseReturnResponse(
        id=purchase_return.id,
        return_number=purchase_return.return_number,
        vendor_id=purchase_return.vendor_id,
        vendor_name=await _vendor_name(purchase_return.vendor_id, db),
        purchase_invoice_id=purchase_return.purchase_invoice_id,
        return_date=purchase_return.return_date,
        due_in=purchase_return.due_in,
        subtotal=purchase_return.subtotal,
        discount_amount=purchase_return.discount_amount,
        additional_charges=purchase_return.additional_charges,
        tax_amount=purchase_return.tax_amount,
        tds_amount=purchase_return.tds_amount,
        tcs_amount=purchase_return.tcs_amount,
        round_off=purchase_return.round_off,
        total_amount=purchase_return.total_amount,
        amount_paid=purchase_return.amount_paid,
        payment_terms=purchase_return.payment_terms,
        terms_and_conditions=purchase_return.terms_and_conditions,
        authorized_signatory_name=purchase_return.authorized_signatory_name,
        authorized_signatory_signature_url=purchase_return.authorized_signatory_signature_url,
        status=purchase_return.status,
        notes=purchase_return.notes,
        created_at=purchase_return.created_at,
        created_by=purchase_return.created_by,
        items=list(purchase_return.items),
    ).model_dump()


async def _debit_note_response(debit_note: DebitNote, db: AsyncSession) -> dict:
    return DebitNoteResponse(
        id=debit_note.id,
        debit_note_number=debit_note.debit_note_number,
        vendor_id=debit_note.vendor_id,
        vendor_name=await _vendor_name(debit_note.vendor_id, db),
        purchase_invoice_id=debit_note.purchase_invoice_id,
        purchase_return_id=debit_note.purchase_return_id,
        note_date=debit_note.note_date,
        subtotal=debit_note.subtotal,
        tax_amount=debit_note.tax_amount,
        total_amount=debit_note.total_amount,
        status=debit_note.status,
        notes=debit_note.notes,
        created_at=debit_note.created_at,
        created_by=debit_note.created_by,
        items=list(debit_note.items),
    ).model_dump()


# --- Purchase Orders ---


@router.get("/orders")
async def list_purchase_orders(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(purchases_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    orders = await PurchaseService(db).list_purchase_orders(vendor_id)
    return success_envelope([await _order_response(o, db) for o in orders])


@router.post("/orders")
async def create_purchase_order(
    payload: PurchaseOrderCreateRequest,
    actor: User = Depends(purchases_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await PurchaseService(db).create_purchase_order(payload, actor.full_name)
    return success_envelope(await _order_response(order, db), "Purchase order created")


@router.post("/orders/{order_id}/receive")
async def receive_purchase_order(
    order_id: uuid.UUID,
    actor: User = Depends(purchases_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    order = await PurchaseService(db).receive_purchase_order(order_id, actor.full_name)
    return success_envelope(await _order_response(order, db), "Purchase order marked as received")


# --- Purchase Invoices ---


@router.get("/invoices")
async def list_purchase_invoices(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(purchases_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoices = await PurchaseService(db).list_purchase_invoices(vendor_id)
    return success_envelope([await _invoice_response(i, db) for i in invoices])


@router.post("/invoices")
async def create_purchase_invoice(
    payload: PurchaseInvoiceCreateRequest,
    actor: User = Depends(purchases_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoice = await PurchaseService(db).create_purchase_invoice(payload, actor.full_name)
    return success_envelope(await _invoice_response(invoice, db), "Purchase invoice recorded")


# --- Payments Out ---


@router.get("/payments-out")
async def list_payments_out(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(purchases_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payments = await PurchaseService(db).list_payments_out(vendor_id)
    return success_envelope([await _payment_out_response(p, db) for p in payments])


@router.post("/payments-out")
async def create_payment_out(
    payload: PaymentOutCreateRequest,
    actor: User = Depends(purchases_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payment = await PurchaseService(db).create_payment_out(payload, actor.full_name, actor.id)
    return success_envelope(await _payment_out_response(payment, db), "Payment out recorded")


# --- Purchase Returns ---


@router.get("/returns")
async def list_purchase_returns(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(purchases_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    returns = await PurchaseService(db).list_purchase_returns(vendor_id)
    return success_envelope([await _return_response(r, db) for r in returns])


@router.post("/returns")
async def create_purchase_return(
    payload: PurchaseReturnCreateRequest,
    actor: User = Depends(purchases_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    purchase_return = await PurchaseService(db).create_purchase_return(payload, actor.full_name)
    return success_envelope(await _return_response(purchase_return, db), "Purchase return recorded")


# --- Debit Notes ---


@router.get("/debit-notes")
async def list_debit_notes(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(purchases_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    notes = await PurchaseService(db).list_debit_notes(vendor_id)
    return success_envelope([await _debit_note_response(n, db) for n in notes])


@router.post("/debit-notes")
async def create_debit_note(
    payload: DebitNoteCreateRequest,
    actor: User = Depends(purchases_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    debit_note = await PurchaseService(db).create_debit_note(payload, actor.full_name)
    return success_envelope(await _debit_note_response(debit_note, db), "Debit note recorded")
