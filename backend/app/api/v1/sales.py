import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.sale import (
    CreditNote,
    DeliveryChallan,
    PaymentIn,
    ProformaInvoice,
    Quotation,
    SalesInvoice,
    SalesReturn,
)
from app.models.user import User
from app.repositories.sale_repository import SaleRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.sale import (
    CreditNoteCreateRequest,
    CreditNoteResponse,
    DeliveryChallanCreateRequest,
    DeliveryChallanResponse,
    PaymentInAllocationResponse,
    PaymentInCreateRequest,
    PaymentInResponse,
    ProformaInvoiceCreateRequest,
    ProformaInvoiceResponse,
    QuotationCreateRequest,
    QuotationResponse,
    SalesInvoiceCreateRequest,
    SalesInvoiceResponse,
    SalesReturnCreateRequest,
    SalesReturnResponse,
)
from app.services.sale_service import SaleService

router = APIRouter(prefix="/sales", tags=["sales"])

sales_view = require_permission(PermissionFeature.SALES, PermissionLevel.VIEW)
sales_full = require_permission(PermissionFeature.SALES, PermissionLevel.FULL)


async def _vendor_name(vendor_id: uuid.UUID, db: AsyncSession) -> str:
    vendor = await VendorRepository(db).get_by_id(vendor_id)
    return vendor.name if vendor else "Unknown party"


async def _quotation_response(quotation: Quotation, db: AsyncSession) -> dict:
    return QuotationResponse(
        id=quotation.id,
        quote_number=quotation.quote_number,
        vendor_id=quotation.vendor_id,
        vendor_name=await _vendor_name(quotation.vendor_id, db),
        quote_date=quotation.quote_date,
        valid_till=quotation.valid_till,
        status=quotation.status,
        subtotal=quotation.subtotal,
        discount_amount=quotation.discount_amount,
        tax_amount=quotation.tax_amount,
        round_off=quotation.round_off,
        total_amount=quotation.total_amount,
        notes=quotation.notes,
        created_at=quotation.created_at,
        created_by=quotation.created_by,
        items=list(quotation.items),
    ).model_dump()


async def _invoice_response(invoice: SalesInvoice, db: AsyncSession) -> dict:
    return SalesInvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        vendor_id=invoice.vendor_id,
        vendor_name=await _vendor_name(invoice.vendor_id, db),
        quotation_id=invoice.quotation_id,
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


async def _payment_in_response(payment: PaymentIn, db: AsyncSession) -> dict:
    allocations = []
    for allocation in payment.allocations:
        invoice = await SaleRepository(db).get_sales_invoice(allocation.sales_invoice_id)
        allocations.append(
            PaymentInAllocationResponse(
                sales_invoice_id=allocation.sales_invoice_id,
                invoice_number=invoice.invoice_number if invoice else "",
                amount=allocation.amount,
                discount=allocation.discount,
            )
        )
    return PaymentInResponse(
        id=payment.id,
        payment_number=payment.payment_number,
        vendor_id=payment.vendor_id,
        vendor_name=await _vendor_name(payment.vendor_id, db),
        sales_invoice_id=payment.sales_invoice_id,
        amount=payment.amount,
        discount_amount=payment.discount_amount,
        payment_date=payment.payment_date,
        method=payment.method,
        reference=payment.reference,
        notes=payment.notes,
        created_at=payment.created_at,
        allocations=allocations,
    ).model_dump()


async def _return_response(sales_return: SalesReturn, db: AsyncSession) -> dict:
    return SalesReturnResponse(
        id=sales_return.id,
        return_number=sales_return.return_number,
        vendor_id=sales_return.vendor_id,
        vendor_name=await _vendor_name(sales_return.vendor_id, db),
        sales_invoice_id=sales_return.sales_invoice_id,
        return_date=sales_return.return_date,
        due_in=sales_return.due_in,
        subtotal=sales_return.subtotal,
        discount_amount=sales_return.discount_amount,
        additional_charges=sales_return.additional_charges,
        tax_amount=sales_return.tax_amount,
        tds_amount=sales_return.tds_amount,
        tcs_amount=sales_return.tcs_amount,
        round_off=sales_return.round_off,
        total_amount=sales_return.total_amount,
        amount_paid=sales_return.amount_paid,
        payment_terms=sales_return.payment_terms,
        terms_and_conditions=sales_return.terms_and_conditions,
        authorized_signatory_name=sales_return.authorized_signatory_name,
        authorized_signatory_signature_url=sales_return.authorized_signatory_signature_url,
        status=sales_return.status,
        notes=sales_return.notes,
        created_at=sales_return.created_at,
        created_by=sales_return.created_by,
        items=list(sales_return.items),
    ).model_dump()


async def _credit_note_response(credit_note: CreditNote, db: AsyncSession) -> dict:
    return CreditNoteResponse(
        id=credit_note.id,
        credit_note_number=credit_note.credit_note_number,
        vendor_id=credit_note.vendor_id,
        vendor_name=await _vendor_name(credit_note.vendor_id, db),
        sales_invoice_id=credit_note.sales_invoice_id,
        sales_return_id=credit_note.sales_return_id,
        note_date=credit_note.note_date,
        subtotal=credit_note.subtotal,
        discount_amount=credit_note.discount_amount,
        additional_charges=credit_note.additional_charges,
        tax_amount=credit_note.tax_amount,
        tds_amount=credit_note.tds_amount,
        tcs_amount=credit_note.tcs_amount,
        round_off=credit_note.round_off,
        total_amount=credit_note.total_amount,
        amount_paid=credit_note.amount_paid,
        payment_terms=credit_note.payment_terms,
        terms_and_conditions=credit_note.terms_and_conditions,
        authorized_signatory_name=credit_note.authorized_signatory_name,
        authorized_signatory_signature_url=credit_note.authorized_signatory_signature_url,
        status=credit_note.status,
        notes=credit_note.notes,
        created_at=credit_note.created_at,
        created_by=credit_note.created_by,
        items=list(credit_note.items),
    ).model_dump()


async def _challan_response(challan: DeliveryChallan, db: AsyncSession) -> dict:
    return DeliveryChallanResponse(
        id=challan.id,
        challan_number=challan.challan_number,
        vendor_id=challan.vendor_id,
        vendor_name=await _vendor_name(challan.vendor_id, db),
        quotation_id=challan.quotation_id,
        sales_invoice_id=challan.sales_invoice_id,
        challan_date=challan.challan_date,
        status=challan.status,
        subtotal=challan.subtotal,
        discount_amount=challan.discount_amount,
        additional_charges=challan.additional_charges,
        tax_amount=challan.tax_amount,
        tds_amount=challan.tds_amount,
        tcs_amount=challan.tcs_amount,
        round_off=challan.round_off,
        total_amount=challan.total_amount,
        amount_paid=challan.amount_paid,
        payment_terms=challan.payment_terms,
        terms_and_conditions=challan.terms_and_conditions,
        authorized_signatory_name=challan.authorized_signatory_name,
        authorized_signatory_signature_url=challan.authorized_signatory_signature_url,
        notes=challan.notes,
        created_at=challan.created_at,
        created_by=challan.created_by,
        items=list(challan.items),
    ).model_dump()


async def _proforma_response(proforma: ProformaInvoice, db: AsyncSession) -> dict:
    return ProformaInvoiceResponse(
        id=proforma.id,
        proforma_number=proforma.proforma_number,
        vendor_id=proforma.vendor_id,
        vendor_name=await _vendor_name(proforma.vendor_id, db),
        quotation_id=proforma.quotation_id,
        proforma_date=proforma.proforma_date,
        valid_till=proforma.valid_till,
        status=proforma.status,
        subtotal=proforma.subtotal,
        discount_amount=proforma.discount_amount,
        additional_charges=proforma.additional_charges,
        tax_amount=proforma.tax_amount,
        tds_amount=proforma.tds_amount,
        tcs_amount=proforma.tcs_amount,
        round_off=proforma.round_off,
        total_amount=proforma.total_amount,
        amount_paid=proforma.amount_paid,
        payment_terms=proforma.payment_terms,
        terms_and_conditions=proforma.terms_and_conditions,
        authorized_signatory_name=proforma.authorized_signatory_name,
        authorized_signatory_signature_url=proforma.authorized_signatory_signature_url,
        notes=proforma.notes,
        created_at=proforma.created_at,
        created_by=proforma.created_by,
        items=list(proforma.items),
    ).model_dump()


# --- Quotations ---


@router.get("/quotations")
async def list_quotations(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(sales_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    quotations = await SaleService(db).list_quotations(vendor_id)
    return success_envelope([await _quotation_response(q, db) for q in quotations])


@router.post("/quotations")
async def create_quotation(
    payload: QuotationCreateRequest,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    quotation = await SaleService(db).create_quotation(payload, actor.full_name)
    return success_envelope(await _quotation_response(quotation, db), "Quotation created")


# --- Sales Invoices ---


@router.get("/invoices")
async def list_sales_invoices(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(sales_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoices = await SaleService(db).list_sales_invoices(vendor_id)
    return success_envelope([await _invoice_response(i, db) for i in invoices])


@router.post("/invoices")
async def create_sales_invoice(
    payload: SalesInvoiceCreateRequest,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoice = await SaleService(db).create_sales_invoice(payload, actor.full_name)
    return success_envelope(await _invoice_response(invoice, db), "Sales invoice recorded")


@router.post("/invoices/{invoice_id}/cancel")
async def cancel_sales_invoice(
    invoice_id: uuid.UUID,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    invoice = await SaleService(db).cancel_sales_invoice(invoice_id, actor.full_name)
    return success_envelope(await _invoice_response(invoice, db), "Sales invoice cancelled")


# --- Payments In ---


@router.get("/payments-in")
async def list_payments_in(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(sales_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payments = await SaleService(db).list_payments_in(vendor_id)
    return success_envelope([await _payment_in_response(p, db) for p in payments])


@router.post("/payments-in")
async def create_payment_in(
    payload: PaymentInCreateRequest,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payment = await SaleService(db).create_payment_in(payload, actor.full_name, actor.id)
    return success_envelope(await _payment_in_response(payment, db), "Payment in recorded")


# --- Sales Returns ---


@router.get("/returns")
async def list_sales_returns(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(sales_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    returns = await SaleService(db).list_sales_returns(vendor_id)
    return success_envelope([await _return_response(r, db) for r in returns])


@router.post("/returns")
async def create_sales_return(
    payload: SalesReturnCreateRequest,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    sales_return = await SaleService(db).create_sales_return(payload, actor.full_name)
    return success_envelope(await _return_response(sales_return, db), "Sales return recorded")


# --- Credit Notes ---


@router.get("/credit-notes")
async def list_credit_notes(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(sales_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    notes = await SaleService(db).list_credit_notes(vendor_id)
    return success_envelope([await _credit_note_response(n, db) for n in notes])


@router.post("/credit-notes")
async def create_credit_note(
    payload: CreditNoteCreateRequest,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    credit_note = await SaleService(db).create_credit_note(payload, actor.full_name)
    return success_envelope(await _credit_note_response(credit_note, db), "Credit note recorded")


# --- Delivery Challans ---


@router.get("/delivery-challans")
async def list_delivery_challans(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(sales_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    challans = await SaleService(db).list_delivery_challans(vendor_id)
    return success_envelope([await _challan_response(c, db) for c in challans])


@router.post("/delivery-challans")
async def create_delivery_challan(
    payload: DeliveryChallanCreateRequest,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    challan = await SaleService(db).create_delivery_challan(payload, actor.full_name)
    return success_envelope(await _challan_response(challan, db), "Delivery challan recorded")


# --- Proforma Invoices ---


@router.get("/proforma-invoices")
async def list_proforma_invoices(
    vendor_id: uuid.UUID | None = Query(default=None),
    _: User = Depends(sales_view),
    db: AsyncSession = Depends(get_db),
) -> dict:
    proformas = await SaleService(db).list_proforma_invoices(vendor_id)
    return success_envelope([await _proforma_response(p, db) for p in proformas])


@router.post("/proforma-invoices")
async def create_proforma_invoice(
    payload: ProformaInvoiceCreateRequest,
    actor: User = Depends(sales_full),
    db: AsyncSession = Depends(get_db),
) -> dict:
    proforma = await SaleService(db).create_proforma_invoice(payload, actor.full_name)
    return success_envelope(await _proforma_response(proforma, db), "Proforma invoice created")
