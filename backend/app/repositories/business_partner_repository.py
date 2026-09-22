import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
from app.models.enums import PartnerStatus

_CHILD_RELATIONSHIPS = (
    selectinload(BusinessPartner.bank_accounts),
    selectinload(BusinessPartner.capital_contributions),
    selectinload(BusinessPartner.profit_loss_ratios),
    selectinload(BusinessPartner.drawings),
    selectinload(BusinessPartner.profit_loss_allocations),
    selectinload(BusinessPartner.remunerations),
    selectinload(BusinessPartner.capital_interest_entries),
    selectinload(BusinessPartner.loans),
    selectinload(BusinessPartner.joint_liabilities),
    selectinload(BusinessPartner.responsibilities),
)


class BusinessPartnerRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, partner_id: uuid.UUID) -> BusinessPartner | None:
        return await self.db.get(BusinessPartner, partner_id)

    async def get_with_children(self, partner_id: uuid.UUID) -> BusinessPartner | None:
        result = await self.db.execute(
            select(BusinessPartner).where(BusinessPartner.id == partner_id).options(*_CHILD_RELATIONSHIPS)
        )
        return result.scalar_one_or_none()

    async def search(self, query: str | None = None, status: PartnerStatus | None = None) -> list[BusinessPartner]:
        stmt = select(BusinessPartner).options(*_CHILD_RELATIONSHIPS)
        if query:
            like = f"%{query.lower()}%"
            stmt = stmt.where(func.lower(BusinessPartner.name).like(like))
        if status is not None:
            stmt = stmt.where(BusinessPartner.status == status)
        stmt = stmt.order_by(BusinessPartner.name)
        result = await self.db.execute(stmt)
        return list(result.scalars().unique().all())

    def add(self, partner: BusinessPartner) -> None:
        self.db.add(partner)

    def add_bank_account(self, row: PartnerBankAccount) -> None:
        self.db.add(row)

    async def get_bank_account(self, row_id: uuid.UUID) -> PartnerBankAccount | None:
        return await self.db.get(PartnerBankAccount, row_id)

    async def list_bank_accounts(self, partner_id: uuid.UUID) -> list[PartnerBankAccount]:
        """Loads the accounts on their own rather than through ``BusinessPartner.bank_accounts``:
        a loaded parent collection cascades save-update on flush and would resurrect a row
        deleted in the same unit of work."""
        result = await self.db.execute(select(PartnerBankAccount).where(PartnerBankAccount.partner_id == partner_id))
        return list(result.scalars().all())

    async def delete_bank_account(self, row: PartnerBankAccount) -> None:
        await self.db.delete(row)

    def add_capital_contribution(self, row: PartnerCapitalContribution) -> None:
        self.db.add(row)

    async def get_capital_contribution(self, row_id: uuid.UUID) -> PartnerCapitalContribution | None:
        return await self.db.get(PartnerCapitalContribution, row_id)

    async def delete_capital_contribution(self, row: PartnerCapitalContribution) -> None:
        await self.db.delete(row)

    def add_profit_loss_ratio(self, row: PartnerProfitLossRatio) -> None:
        self.db.add(row)

    async def get_profit_loss_ratio(self, row_id: uuid.UUID) -> PartnerProfitLossRatio | None:
        return await self.db.get(PartnerProfitLossRatio, row_id)

    async def delete_profit_loss_ratio(self, row: PartnerProfitLossRatio) -> None:
        await self.db.delete(row)

    def add_drawing(self, row: PartnerDrawing) -> None:
        self.db.add(row)

    async def get_drawing(self, row_id: uuid.UUID) -> PartnerDrawing | None:
        return await self.db.get(PartnerDrawing, row_id)

    async def delete_drawing(self, row: PartnerDrawing) -> None:
        await self.db.delete(row)

    def add_profit_loss_allocation(self, row: PartnerProfitLossAllocation) -> None:
        self.db.add(row)

    async def get_profit_loss_allocation(self, row_id: uuid.UUID) -> PartnerProfitLossAllocation | None:
        return await self.db.get(PartnerProfitLossAllocation, row_id)

    async def delete_profit_loss_allocation(self, row: PartnerProfitLossAllocation) -> None:
        await self.db.delete(row)

    def add_remuneration(self, row: PartnerRemuneration) -> None:
        self.db.add(row)

    async def get_remuneration(self, row_id: uuid.UUID) -> PartnerRemuneration | None:
        return await self.db.get(PartnerRemuneration, row_id)

    async def delete_remuneration(self, row: PartnerRemuneration) -> None:
        await self.db.delete(row)

    def add_capital_interest(self, row: PartnerCapitalInterest) -> None:
        self.db.add(row)

    async def get_capital_interest(self, row_id: uuid.UUID) -> PartnerCapitalInterest | None:
        return await self.db.get(PartnerCapitalInterest, row_id)

    async def delete_capital_interest(self, row: PartnerCapitalInterest) -> None:
        await self.db.delete(row)

    def add_loan(self, row: PartnerLoan) -> None:
        self.db.add(row)

    async def get_loan(self, row_id: uuid.UUID) -> PartnerLoan | None:
        return await self.db.get(PartnerLoan, row_id)

    async def delete_loan(self, row: PartnerLoan) -> None:
        await self.db.delete(row)

    def add_joint_liability(self, row: PartnerJointLiability) -> None:
        self.db.add(row)

    async def get_joint_liability(self, row_id: uuid.UUID) -> PartnerJointLiability | None:
        return await self.db.get(PartnerJointLiability, row_id)

    async def delete_joint_liability(self, row: PartnerJointLiability) -> None:
        await self.db.delete(row)

    def add_responsibility(self, row: PartnerResponsibility) -> None:
        self.db.add(row)

    async def get_responsibility(self, row_id: uuid.UUID) -> PartnerResponsibility | None:
        return await self.db.get(PartnerResponsibility, row_id)

    async def delete_responsibility(self, row: PartnerResponsibility) -> None:
        await self.db.delete(row)
