import uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.crate import CrateDispute, CrateTransaction
from app.models.enums import CrateTxnType, DisputeStatus
from app.repositories.crate_repository import CrateRepository
from app.repositories.vendor_repository import VendorRepository
from app.schemas.crate import CrateReconciliationRequest
from app.services.audit_service import AuditService


class CrateService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = CrateRepository(db)
        self.vendors = VendorRepository(db)
        self.audit = AuditService(db)

    async def get_summary(self) -> list[dict]:
        vendors = await self.vendors.search(None)
        txns = await self.repo.list_all_transactions()
        by_vendor: dict[uuid.UUID, dict[str, int]] = defaultdict(lambda: {"given": 0, "returned": 0, "broken": 0, "balance": 0})
        for txn in txns:
            bucket = by_vendor[txn.vendor_id]
            if txn.txn_type == CrateTxnType.ISSUE:
                bucket["given"] += txn.quantity
                bucket["balance"] += txn.quantity
            elif txn.txn_type == CrateTxnType.RETURN:
                bucket["returned"] += txn.quantity
                bucket["balance"] -= txn.quantity
            elif txn.txn_type == CrateTxnType.DAMAGE:
                bucket["broken"] += txn.quantity
                bucket["balance"] -= txn.quantity
            else:  # ADJUSTMENT
                bucket["balance"] -= txn.quantity

        return [
            {
                "vendor_id": v.id,
                "vendor_name": v.name,
                "given": by_vendor[v.id]["given"],
                "returned": by_vendor[v.id]["returned"],
                "balance": max(0, by_vendor[v.id]["balance"]),
                "broken": by_vendor[v.id]["broken"],
            }
            for v in vendors
        ]

    async def list_transactions(self, vendor_id: uuid.UUID | None = None) -> list[tuple[CrateTransaction, str]]:
        txns = await self.repo.list_transactions(vendor_id)
        results = []
        for txn in txns:
            vendor = await self.vendors.get_by_id(txn.vendor_id)
            results.append((txn, vendor.name if vendor else "Unknown vendor"))
        return results

    async def post_reconciliation(
        self, data: CrateReconciliationRequest, actor_name: str, actor_id: uuid.UUID
    ) -> CrateTransaction:
        vendor = await self.vendors.get_by_id(data.vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")
        txn = CrateTransaction(
            vendor_id=vendor.id,
            txn_type=data.txn_type,
            quantity=data.quantity,
            note=data.note or "Manual adjustment",
            created_by=actor_id,
        )
        self.repo.add_transaction(txn)

        delta = {
            CrateTxnType.ISSUE: data.quantity,
            CrateTxnType.RETURN: -data.quantity,
            CrateTxnType.DAMAGE: -data.quantity,
            CrateTxnType.ADJUSTMENT: -data.quantity,
        }[data.txn_type]
        vendor.crates_with_vendor = max(0, vendor.crates_with_vendor + delta)

        self.audit.log(
            actor_name,
            f"posted {data.txn_type.value} adjustment ({data.quantity}) — {vendor.name}",
            entity_type="vendor",
            entity_id=vendor.id,
        )
        await self.db.commit()
        return txn

    async def list_disputes(self, status: DisputeStatus | None = None) -> list[tuple[CrateDispute, str]]:
        disputes = await self.repo.list_disputes(status)
        results = []
        for d in disputes:
            vendor = await self.vendors.get_by_id(d.vendor_id)
            results.append((d, vendor.name if vendor else "Unknown vendor"))
        return results

    async def create_dispute(
        self,
        vendor_id: uuid.UUID,
        driver_reported_qty: int,
        vendor_confirmed_qty: int,
        related_delivery_id: uuid.UUID | None,
        actor_name: str,
    ) -> CrateDispute:
        vendor = await self.vendors.get_by_id(vendor_id)
        if vendor is None:
            raise NotFoundError("Vendor not found")
        dispute = CrateDispute(
            vendor_id=vendor_id,
            related_delivery_id=related_delivery_id,
            driver_reported_qty=driver_reported_qty,
            vendor_confirmed_qty=vendor_confirmed_qty,
        )
        self.repo.add_dispute(dispute)
        self.audit.log(
            actor_name,
            f"flagged crate dispute — {vendor.name}",
            entity_type="vendor",
            entity_id=vendor.id,
        )
        await self.db.commit()
        await self.db.refresh(dispute)
        return dispute

    async def resolve_dispute(self, dispute_id: uuid.UUID, resolution_note: str, actor_name: str, actor_id: uuid.UUID) -> CrateDispute:
        dispute = await self.repo.get_dispute(dispute_id)
        if dispute is None:
            raise NotFoundError("Dispute not found")
        vendor = await self.vendors.get_by_id(dispute.vendor_id)
        dispute.status = DisputeStatus.RESOLVED
        dispute.resolution_note = resolution_note
        dispute.resolved_by = actor_id
        dispute.resolved_at = datetime.now(timezone.utc)
        self.audit.log(
            actor_name,
            f"resolved crate dispute — {vendor.name if vendor else ''} (accepted {dispute.vendor_confirmed_qty})",
            entity_type="vendor",
            entity_id=dispute.vendor_id,
        )
        await self.db.commit()
        await self.db.refresh(dispute)
        return dispute
