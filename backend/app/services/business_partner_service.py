import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.business_partner import (
    BusinessPartner,
    PartnerBankAccount,
    PartnerCapitalContribution,
    PartnerCapitalInterest,
    PartnerDrawing,
    PartnerJointLiability,
    PartnerLoan,
    PartnerProfitLossAllocation,
    PartnerProfitLossRatio,
    PartnerRemuneration,
    PartnerResponsibility,
)
from app.models.enums import CapitalContributionType, PartnerStatus
from app.repositories.business_partner_repository import BusinessPartnerRepository
from app.schemas.business_partner import (
    BankAccountInput,
    BusinessPartnerCreateRequest,
    BusinessPartnerUpdateRequest,
    CapitalContributionInput,
    CapitalInterestInput,
    CapitalInterestUpdateRequest,
    DrawingInput,
    JointLiabilityInput,
    JointLiabilityUpdateRequest,
    LoanInput,
    LoanUpdateRequest,
    ProfitLossAllocationInput,
    ProfitLossRatioInput,
    RemunerationInput,
    ResponsibilityInput,
)
from app.services.audit_service import AuditService

PARTNER_UPDATE_FIELDS = (
    "name",
    "address",
    "phone",
    "email",
    "tin",
    "pan_number",
    "gstin",
    "other_tax_details",
    "opening_capital_balance",
    "opening_balance_date",
    "status",
)


def attach_computed_fields(partner: BusinessPartner) -> BusinessPartner:
    """Derives the capital-balance and totals fields the response schemas expect,
    since they're computed from child rows rather than stored (spec requirement)."""
    total_contributed = sum((c.amount for c in partner.capital_contributions), Decimal("0"))
    total_drawings = sum((d.amount for d in partner.drawings), Decimal("0"))
    total_allocations = sum((a.amount for a in partner.profit_loss_allocations), Decimal("0"))

    latest_ratio = max(partner.profit_loss_ratios, key=lambda r: r.effective_date, default=None)

    partner.total_capital_contributed = total_contributed
    partner.total_additional_contributed = sum(
        (c.amount for c in partner.capital_contributions if c.contribution_type == CapitalContributionType.ADDITIONAL),
        Decimal("0"),
    )
    partner.total_expected_interest = sum(
        (c.interest_amount for c in partner.capital_contributions if c.interest_amount is not None), Decimal("0")
    )
    partner.total_drawings = total_drawings
    partner.current_capital_balance = (
        partner.opening_capital_balance + total_contributed - total_drawings + total_allocations
    )
    partner.current_profit_percentage = latest_ratio.profit_percentage if latest_ratio else None
    partner.current_loss_percentage = latest_ratio.loss_percentage if latest_ratio else None
    partner.total_outstanding_loans = sum((loan.outstanding_balance for loan in partner.loans), Decimal("0"))
    partner.total_outstanding_liabilities = sum(
        (liability.outstanding_amount for liability in partner.joint_liabilities), Decimal("0")
    )
    return partner


class BusinessPartnerService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = BusinessPartnerRepository(db)
        self.audit = AuditService(db)

    async def list_partners(self, query: str | None = None, status: PartnerStatus | None = None) -> list[BusinessPartner]:
        partners = await self.repo.search(query, status)
        return [attach_computed_fields(p) for p in partners]

    async def get_partner(self, partner_id: uuid.UUID) -> BusinessPartner:
        partner = await self.repo.get_by_id(partner_id)
        if partner is None:
            raise NotFoundError("Business partner not found")
        return partner

    async def get_partner_detail(self, partner_id: uuid.UUID) -> BusinessPartner:
        partner = await self.repo.get_with_children(partner_id)
        if partner is None:
            raise NotFoundError("Business partner not found")
        return attach_computed_fields(partner)

    async def create_partner(
        self, data: BusinessPartnerCreateRequest, actor_name: str, actor_id: uuid.UUID | None = None
    ) -> BusinessPartner:
        partner = BusinessPartner(
            name=data.name,
            address=data.address,
            phone=data.phone,
            email=data.email,
            tin=data.tin,
            pan_number=data.pan_number,
            gstin=data.gstin,
            other_tax_details=data.other_tax_details,
            opening_capital_balance=data.opening_capital_balance,
            opening_balance_date=data.opening_balance_date,
        )
        self.repo.add(partner)
        # The first account supplied is the payout default unless one is flagged explicitly.
        accounts = data.bank_accounts
        if not any(account.is_primary for account in accounts):
            accounts[0].is_primary = True
        for account in accounts:
            self._append_bank_account(partner, account, actor_id)
        self.audit.log(actor_name, f"added business partner {data.name}")
        await self.db.commit()
        await self.db.refresh(partner)
        return attach_computed_fields(await self.repo.get_with_children(partner.id))

    async def update_partner(
        self, partner_id: uuid.UUID, data: BusinessPartnerUpdateRequest, actor_name: str
    ) -> BusinessPartner:
        partner = await self.get_partner(partner_id)
        for field in PARTNER_UPDATE_FIELDS:
            value = getattr(data, field)
            if value is not None:
                setattr(partner, field, value)
        self.audit.log(
            actor_name, f"updated business partner {partner.name}", entity_type="business_partner", entity_id=partner.id
        )
        await self.db.commit()
        return attach_computed_fields(await self.repo.get_with_children(partner.id))

    # --- Bank accounts ---

    def _append_bank_account(
        self, partner: BusinessPartner, data: BankAccountInput, actor_id: uuid.UUID | None
    ) -> PartnerBankAccount:
        account = PartnerBankAccount(
            partner=partner,
            account_number=data.account_number,
            account_holder_name=data.account_holder_name,
            bank_name=data.bank_name,
            ifsc_code=data.ifsc_code.upper() if data.ifsc_code else None,
            branch_name=data.branch_name,
            is_primary=data.is_primary,
            created_by=actor_id,
        )
        self.repo.add_bank_account(account)
        return account

    async def add_bank_account(
        self, partner_id: uuid.UUID, data: BankAccountInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerBankAccount:
        partner = await self.get_partner(partner_id)
        # Demote the existing default before the new row is flushed, so the incoming
        # account is the only one left holding the flag.
        if data.is_primary:
            await self._clear_other_primary_accounts(partner_id)
        account = self._append_bank_account(partner, data, actor_id)
        self.audit.log(
            actor_name, f"added bank account for {partner.name}", entity_type="business_partner", entity_id=partner.id
        )
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def set_primary_bank_account(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> PartnerBankAccount:
        row = await self.repo.get_bank_account(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Bank account not found")
        await self._clear_other_primary_accounts(partner_id, keep_id=row.id)
        row.is_primary = True
        self.audit.log(
            actor_name, "changed the primary partner bank account", entity_type="business_partner", entity_id=partner_id
        )
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_bank_account(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_bank_account(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Bank account not found")
        remaining = [a for a in await self.repo.list_bank_accounts(partner_id) if a.id != row.id]
        if not remaining:
            raise BusinessRuleError("A partner must keep at least one bank account")
        if row.is_primary:
            # Never leave the partner without a payout default.
            remaining[0].is_primary = True
        await self.repo.delete_bank_account(row)
        self.audit.log(actor_name, "removed a partner bank account", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    async def _clear_other_primary_accounts(self, partner_id: uuid.UUID, keep_id: uuid.UUID | None = None) -> None:
        """Only one account can be the payout default at a time."""
        for account in await self.repo.list_bank_accounts(partner_id):
            if account.id != keep_id:
                account.is_primary = False

    # --- Capital contributions ---

    async def add_capital_contribution(
        self, partner_id: uuid.UUID, data: CapitalContributionInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerCapitalContribution:
        partner = await self.get_partner(partner_id)
        row = PartnerCapitalContribution(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_capital_contribution(row)
        self.audit.log(
            actor_name, f"added capital contribution for {partner.name}", entity_type="business_partner", entity_id=partner.id
        )
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_capital_contribution(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_capital_contribution(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Capital contribution not found")
        await self.repo.delete_capital_contribution(row)
        self.audit.log(actor_name, "removed a partner capital contribution", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Profit & loss ratios ---

    async def add_profit_loss_ratio(
        self, partner_id: uuid.UUID, data: ProfitLossRatioInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerProfitLossRatio:
        partner = await self.get_partner(partner_id)
        row = PartnerProfitLossRatio(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_profit_loss_ratio(row)
        self.audit.log(
            actor_name, f"updated profit/loss ratio for {partner.name}", entity_type="business_partner", entity_id=partner.id
        )
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_profit_loss_ratio(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_profit_loss_ratio(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Profit/loss ratio entry not found")
        await self.repo.delete_profit_loss_ratio(row)
        self.audit.log(actor_name, "removed a partner profit/loss ratio entry", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Drawings ---

    async def add_drawing(
        self, partner_id: uuid.UUID, data: DrawingInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerDrawing:
        partner = await self.get_partner(partner_id)
        row = PartnerDrawing(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_drawing(row)
        self.audit.log(actor_name, f"recorded a drawing for {partner.name}", entity_type="business_partner", entity_id=partner.id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_drawing(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_drawing(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Drawing not found")
        await self.repo.delete_drawing(row)
        self.audit.log(actor_name, "removed a partner drawing", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Profit & loss allocations (feed the capital account balance) ---

    async def add_profit_loss_allocation(
        self, partner_id: uuid.UUID, data: ProfitLossAllocationInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerProfitLossAllocation:
        partner = await self.get_partner(partner_id)
        row = PartnerProfitLossAllocation(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_profit_loss_allocation(row)
        self.audit.log(
            actor_name, f"recorded a profit/loss allocation for {partner.name}", entity_type="business_partner", entity_id=partner.id
        )
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_profit_loss_allocation(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_profit_loss_allocation(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Profit/loss allocation not found")
        await self.repo.delete_profit_loss_allocation(row)
        self.audit.log(actor_name, "removed a partner profit/loss allocation", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Remuneration ---

    async def add_remuneration(
        self, partner_id: uuid.UUID, data: RemunerationInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerRemuneration:
        partner = await self.get_partner(partner_id)
        row = PartnerRemuneration(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_remuneration(row)
        self.audit.log(actor_name, f"added remuneration terms for {partner.name}", entity_type="business_partner", entity_id=partner.id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_remuneration(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_remuneration(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Remuneration entry not found")
        await self.repo.delete_remuneration(row)
        self.audit.log(actor_name, "removed a partner remuneration entry", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Interest on capital ---

    async def add_capital_interest(
        self, partner_id: uuid.UUID, data: CapitalInterestInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerCapitalInterest:
        partner = await self.get_partner(partner_id)
        row = PartnerCapitalInterest(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_capital_interest(row)
        self.audit.log(
            actor_name, f"recorded interest on capital for {partner.name}", entity_type="business_partner", entity_id=partner.id
        )
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def update_capital_interest(
        self, partner_id: uuid.UUID, row_id: uuid.UUID, data: CapitalInterestUpdateRequest, actor_name: str
    ) -> PartnerCapitalInterest:
        row = await self.repo.get_capital_interest(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Interest entry not found")
        row.payment_status = data.payment_status
        self.audit.log(actor_name, "updated a partner interest payment status", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_capital_interest(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_capital_interest(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Interest entry not found")
        await self.repo.delete_capital_interest(row)
        self.audit.log(actor_name, "removed a partner interest entry", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Loans from partners ---

    async def add_loan(
        self, partner_id: uuid.UUID, data: LoanInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerLoan:
        partner = await self.get_partner(partner_id)
        row = PartnerLoan(
            partner_id=partner.id,
            created_by=actor_id,
            outstanding_balance=data.loan_amount,
            **data.model_dump(),
        )
        self.repo.add_loan(row)
        self.audit.log(actor_name, f"recorded a loan from {partner.name}", entity_type="business_partner", entity_id=partner.id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def update_loan(
        self, partner_id: uuid.UUID, row_id: uuid.UUID, data: LoanUpdateRequest, actor_name: str
    ) -> PartnerLoan:
        row = await self.repo.get_loan(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Loan not found")
        if data.outstanding_balance is not None:
            row.outstanding_balance = data.outstanding_balance
        if data.loan_status is not None:
            row.loan_status = data.loan_status
        self.audit.log(actor_name, "updated a partner loan", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_loan(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_loan(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Loan not found")
        await self.repo.delete_loan(row)
        self.audit.log(actor_name, "removed a partner loan", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Joint liabilities ---

    async def add_joint_liability(
        self, partner_id: uuid.UUID, data: JointLiabilityInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerJointLiability:
        partner = await self.get_partner(partner_id)
        row = PartnerJointLiability(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_joint_liability(row)
        self.audit.log(actor_name, f"recorded a joint liability for {partner.name}", entity_type="business_partner", entity_id=partner.id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def update_joint_liability(
        self, partner_id: uuid.UUID, row_id: uuid.UUID, data: JointLiabilityUpdateRequest, actor_name: str
    ) -> PartnerJointLiability:
        row = await self.repo.get_joint_liability(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Liability not found")
        if data.outstanding_amount is not None:
            row.outstanding_amount = data.outstanding_amount
        if data.status is not None:
            row.status = data.status
        self.audit.log(actor_name, "updated a partner joint liability", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_joint_liability(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_joint_liability(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Liability not found")
        await self.repo.delete_joint_liability(row)
        self.audit.log(actor_name, "removed a partner joint liability", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()

    # --- Operational responsibilities ---

    async def add_responsibility(
        self, partner_id: uuid.UUID, data: ResponsibilityInput, actor_name: str, actor_id: uuid.UUID
    ) -> PartnerResponsibility:
        partner = await self.get_partner(partner_id)
        row = PartnerResponsibility(partner_id=partner.id, created_by=actor_id, **data.model_dump())
        self.repo.add_responsibility(row)
        self.audit.log(actor_name, f"added a responsibility for {partner.name}", entity_type="business_partner", entity_id=partner.id)
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def delete_responsibility(self, partner_id: uuid.UUID, row_id: uuid.UUID, actor_name: str) -> None:
        row = await self.repo.get_responsibility(row_id)
        if row is None or row.partner_id != partner_id:
            raise NotFoundError("Responsibility not found")
        await self.repo.delete_responsibility(row)
        self.audit.log(actor_name, "removed a partner responsibility", entity_type="business_partner", entity_id=partner_id)
        await self.db.commit()
