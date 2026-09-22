import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.vendor import (
    BankAccountInput,
    BankAccountResponse,
    BulkVendorCreateRequest,
    BulkVendorRowResult,
    CustomFieldInput,
    CustomFieldResponse,
    VendorCreateRequest,
    VendorDetailResponse,
    VendorResponse,
    VendorUpdateRequest,
)
from app.services.vendor_service import VendorService

router = APIRouter(prefix="/vendors", tags=["vendors"])

view_dep = require_permission(PermissionFeature.VENDORS, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.VENDORS, PermissionLevel.FULL)


@router.get("")
async def list_vendors(
    search: str | None = Query(default=None),
    is_supplier: bool | None = Query(default=None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    vendors = await VendorService(db).list_vendors(search, is_supplier)
    return success_envelope([VendorResponse.model_validate(v).model_dump() for v in vendors])


@router.post("")
async def create_vendor(
    payload: VendorCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    vendor = await VendorService(db).create_vendor(payload, actor.full_name)
    return success_envelope(VendorResponse.model_validate(vendor).model_dump(), "Vendor added")


@router.post("/bulk")
async def bulk_create_vendors(
    payload: BulkVendorCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    results = await VendorService(db).bulk_create_vendors(payload.rows, actor.full_name)
    created = sum(1 for r in results if r["success"])
    failed = len(results) - created
    return success_envelope(
        {
            "created_count": created,
            "failed_count": failed,
            "results": [BulkVendorRowResult(**r).model_dump() for r in results],
        },
        f"{created} vendor(s) added" + (f", {failed} failed" if failed else ""),
    )


@router.get("/{vendor_id}")
async def get_vendor(
    vendor_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    vendor = await VendorService(db).get_vendor_detail(vendor_id)
    return success_envelope(VendorDetailResponse.model_validate(vendor).model_dump())


@router.patch("/{vendor_id}")
async def update_vendor(
    vendor_id: uuid.UUID,
    payload: VendorUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    vendor = await VendorService(db).update_vendor(vendor_id, payload, actor.full_name)
    return success_envelope(VendorResponse.model_validate(vendor).model_dump(), "Vendor updated")


@router.post("/{vendor_id}/collect")
async def collect_outstanding(
    vendor_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    vendor = await VendorService(db).record_full_collection(vendor_id, actor.full_name, actor.id)
    return success_envelope(VendorResponse.model_validate(vendor).model_dump(), "Payment collected — account settled")


@router.post("/{vendor_id}/remind")
async def send_reminder(
    vendor_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await VendorService(db).send_reminder(vendor_id, actor.full_name)
    return success_envelope(None, "WhatsApp reminder sent with UPI payment link")


@router.post("/{vendor_id}/bank-accounts")
async def add_bank_account(
    vendor_id: uuid.UUID,
    payload: BankAccountInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    account = await VendorService(db).add_bank_account(vendor_id, payload, actor.full_name)
    return success_envelope(BankAccountResponse.model_validate(account).model_dump(), "Bank account added")


@router.delete("/{vendor_id}/bank-accounts/{account_id}")
async def delete_bank_account(
    vendor_id: uuid.UUID,
    account_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await VendorService(db).delete_bank_account(vendor_id, account_id, actor.full_name)
    return success_envelope(None, "Bank account removed")


@router.post("/{vendor_id}/custom-fields")
async def add_custom_field(
    vendor_id: uuid.UUID,
    payload: CustomFieldInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    field = await VendorService(db).add_custom_field(vendor_id, payload, actor.full_name)
    return success_envelope(CustomFieldResponse.model_validate(field).model_dump(), "Custom field added")


@router.delete("/{vendor_id}/custom-fields/{field_id}")
async def delete_custom_field(
    vendor_id: uuid.UUID,
    field_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await VendorService(db).delete_custom_field(vendor_id, field_id, actor.full_name)
    return success_envelope(None, "Custom field removed")
