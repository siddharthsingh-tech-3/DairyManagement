import uuid
from datetime import date
from decimal import Decimal

from email_validator import EmailNotValidError, validate_email
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.enums import LedgerEntryType
from app.models.vendor import Vendor, VendorBankAccount, VendorCustomField, VendorLedgerEntry
from app.repositories.vendor_repository import VendorRepository
from app.schemas.vendor import (
    BankAccountInput,
    BulkVendorRow,
    CustomFieldInput,
    OpeningBalanceDirection,
    VendorCreateRequest,
    VendorUpdateRequest,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService

VENDOR_UPDATE_FIELDS = (
    "name",
    "category",
    "contact_name",
    "phone",
    "email",
    "area",
    "route",
    "gstin",
    "pan_number",
    "billing_street",
    "billing_city",
    "billing_state",
    "billing_pincode",
    "shipping_street",
    "shipping_city",
    "shipping_state",
    "shipping_pincode",
    "credit_period_days",
    "credit_limit",
    "is_active",
    "is_supplier",
)


class VendorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = VendorRepository(db)
        self.audit = AuditService(db)
        self.notifications = NotificationService()

    async def list_vendors(self, query: str | None = None, is_supplier: bool | None = None) -> list[Vendor]:
        return await self.repo.search(query, is_supplier)

    async def get_vendor(self, vendor_id: uuid.UUID) -> Vendor:
        vendor = await self.repo.get_by_id(vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")
        return vendor

    async def get_vendor_detail(self, vendor_id: uuid.UUID) -> Vendor:
        vendor = await self.repo.get_with_ledger(vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")
        return vendor

    async def create_vendor(self, data: VendorCreateRequest, actor_name: str) -> Vendor:
        code = await self.repo.get_next_code()
        vendor = Vendor(
            code=code,
            name=data.name,
            category=data.category,
            contact_name=data.contact_name,
            phone=data.phone,
            email=data.email,
            area=data.area,
            route=data.route,
            gstin=data.gstin,
            pan_number=data.pan_number,
            billing_street=data.billing_street,
            billing_city=data.billing_city,
            billing_state=data.billing_state,
            billing_pincode=data.billing_pincode,
            shipping_street=data.shipping_street,
            shipping_city=data.shipping_city,
            shipping_state=data.shipping_state,
            shipping_pincode=data.shipping_pincode,
            credit_period_days=data.credit_period_days,
            credit_limit=data.credit_limit,
            vendor_since=data.vendor_since or date.today(),
            is_supplier=data.is_supplier,
        )
        self.repo.add(vendor)

        for account in data.bank_accounts:
            self._append_bank_account(vendor, account)
        for field in data.custom_fields:
            self._append_custom_field(vendor, field)

        self._apply_opening_balance(vendor, data.opening_balance, data.opening_balance_direction)

        self.audit.log(actor_name, f"added vendor {data.name}")
        await self.db.commit()
        await self.db.refresh(vendor)
        return vendor

    def _apply_opening_balance(self, vendor: Vendor, amount: Decimal, direction: OpeningBalanceDirection) -> None:
        if amount <= 0:
            return
        if direction == OpeningBalanceDirection.TO_COLLECT:
            self.repo.add_ledger_entry(
                VendorLedgerEntry(
                    vendor=vendor,
                    entry_type=LedgerEntryType.OPENING_BALANCE,
                    description="Opening balance — to collect",
                    debit=amount,
                )
            )
            vendor.outstanding_balance = amount
        else:
            self.repo.add_ledger_entry(
                VendorLedgerEntry(
                    vendor=vendor,
                    entry_type=LedgerEntryType.OPENING_BALANCE,
                    description="Opening balance — to pay",
                    credit=amount,
                )
            )
            vendor.outstanding_balance = -amount

    async def bulk_create_vendors(self, rows: list[BulkVendorRow], actor_name: str) -> list[dict]:
        results: list[dict] = []
        success_count = 0
        for index, row in enumerate(rows):
            try:
                normalized_email = None
                if row.email:
                    try:
                        normalized_email = validate_email(row.email, check_deliverability=False).normalized
                    except EmailNotValidError as exc:
                        raise ValidationAppError(f"Invalid email '{row.email}': {exc}") from exc

                code = await self.repo.get_next_code()
                vendor = Vendor(
                    code=code,
                    name=row.name,
                    contact_name=row.name,
                    phone=row.phone or "",
                    email=normalized_email,
                    area="Unassigned",
                    route="Unassigned",
                    gstin=row.gstin,
                    billing_street=row.billing_street,
                    billing_city=row.billing_city,
                    billing_state=row.billing_state,
                    billing_pincode=row.billing_pincode,
                    shipping_street=row.shipping_street,
                    shipping_city=row.shipping_city,
                    shipping_state=row.shipping_state,
                    shipping_pincode=row.shipping_pincode,
                    credit_period_days=row.credit_period_days,
                    credit_limit=Decimal("0"),
                    vendor_since=date.today(),
                )
                self.repo.add(vendor)
                self._apply_opening_balance(vendor, row.opening_balance, row.opening_balance_direction)
                await self.db.commit()
                await self.db.refresh(vendor)
                results.append({"row_index": index, "success": True, "name": row.name, "vendor_id": vendor.id, "error": None})
                success_count += 1
            except Exception as exc:  # noqa: BLE001 - isolate one bad row from the rest of the batch
                await self.db.rollback()
                results.append({"row_index": index, "success": False, "name": row.name, "vendor_id": None, "error": str(exc)})

        if success_count:
            self.audit.log(actor_name, f"bulk-added {success_count} vendor(s)")
            await self.db.commit()
        return results

    async def update_vendor(self, vendor_id: uuid.UUID, data: VendorUpdateRequest, actor_name: str) -> Vendor:
        vendor = await self.get_vendor(vendor_id)
        for field in VENDOR_UPDATE_FIELDS:
            value = getattr(data, field)
            if value is not None:
                setattr(vendor, field, value)
        self.audit.log(actor_name, f"updated vendor {vendor.name}", entity_type="vendor", entity_id=vendor.id)
        await self.db.commit()
        await self.db.refresh(vendor)
        return vendor

    def _append_bank_account(self, vendor: Vendor, data: BankAccountInput) -> VendorBankAccount:
        account = VendorBankAccount(
            vendor=vendor,
            account_holder_name=data.account_holder_name,
            account_number=data.account_number,
            ifsc_code=data.ifsc_code.upper(),
            bank_name=data.bank_name,
            is_primary=data.is_primary,
        )
        self.repo.add_bank_account(account)
        return account

    def _append_custom_field(self, vendor: Vendor, data: CustomFieldInput) -> VendorCustomField:
        field = VendorCustomField(vendor=vendor, field_name=data.field_name, field_value=data.field_value)
        self.repo.add_custom_field(field)
        return field

    async def add_bank_account(self, vendor_id: uuid.UUID, data: BankAccountInput, actor_name: str) -> VendorBankAccount:
        vendor = await self.get_vendor(vendor_id)
        account = self._append_bank_account(vendor, data)
        self.audit.log(actor_name, f"added bank account for {vendor.name}", entity_type="vendor", entity_id=vendor.id)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def delete_bank_account(self, vendor_id: uuid.UUID, account_id: uuid.UUID, actor_name: str) -> None:
        account = await self.repo.get_bank_account(account_id)
        if account is None or account.vendor_id != vendor_id:
            raise NotFoundError("Bank account not found")
        await self.repo.delete_bank_account(account)
        self.audit.log(actor_name, "removed a vendor bank account", entity_type="vendor", entity_id=vendor_id)
        await self.db.commit()

    async def add_custom_field(self, vendor_id: uuid.UUID, data: CustomFieldInput, actor_name: str) -> VendorCustomField:
        vendor = await self.get_vendor(vendor_id)
        field = self._append_custom_field(vendor, data)
        self.audit.log(actor_name, f"added custom field '{data.field_name}' for {vendor.name}", entity_type="vendor", entity_id=vendor.id)
        await self.db.commit()
        await self.db.refresh(field)
        return field

    async def delete_custom_field(self, vendor_id: uuid.UUID, field_id: uuid.UUID, actor_name: str) -> None:
        field = await self.repo.get_custom_field(field_id)
        if field is None or field.vendor_id != vendor_id:
            raise NotFoundError("Custom field not found")
        await self.repo.delete_custom_field(field)
        self.audit.log(actor_name, "removed a vendor custom field", entity_type="vendor", entity_id=vendor_id)
        await self.db.commit()

    async def post_ledger_entry(
        self,
        vendor: Vendor,
        entry_type: LedgerEntryType,
        description: str,
        *,
        debit: Decimal = Decimal("0"),
        credit: Decimal = Decimal("0"),
        reference_type: str | None = None,
        reference_id: uuid.UUID | None = None,
        reference_number: str | None = None,
        status: str | None = None,
        tds_deducted_by_party: Decimal = Decimal("0"),
        tds_deducted_by_self: Decimal = Decimal("0"),
        created_by: uuid.UUID | None = None,
    ) -> VendorLedgerEntry:
        entry = VendorLedgerEntry(
            vendor_id=vendor.id,
            entry_type=entry_type,
            description=description,
            debit=debit,
            credit=credit,
            reference_type=reference_type,
            reference_id=reference_id,
            reference_number=reference_number,
            status=status,
            tds_deducted_by_party=tds_deducted_by_party,
            tds_deducted_by_self=tds_deducted_by_self,
            created_by=created_by,
        )
        self.repo.add_ledger_entry(entry)
        vendor.outstanding_balance = vendor.outstanding_balance + debit - credit
        return entry

    async def record_full_collection(self, vendor_id: uuid.UUID, actor_name: str, actor_id: uuid.UUID) -> Vendor:
        vendor = await self.get_vendor(vendor_id)
        outstanding = vendor.outstanding_balance
        if outstanding > 0:
            await self.post_ledger_entry(
                vendor,
                LedgerEntryType.PAYMENT,
                "Payment received — settled",
                credit=outstanding,
                status="paid",
                created_by=actor_id,
            )
        self.audit.log(
            actor_name, f"collected full outstanding from {vendor.name}", entity_type="vendor", entity_id=vendor.id
        )
        await self.db.commit()
        await self.db.refresh(vendor)
        return vendor

    async def send_reminder(self, vendor_id: uuid.UUID, actor_name: str) -> Vendor:
        vendor = await self.get_vendor(vendor_id)
        await self.notifications.send_payment_reminder(
            vendor.name, vendor.phone, str(vendor.outstanding_balance), "upi://pay?pa=kshirsagardairy@upi"
        )
        self.audit.log(actor_name, f"sent payment reminder to {vendor.name}", entity_type="vendor", entity_id=vendor.id)
        await self.db.commit()
        return vendor
