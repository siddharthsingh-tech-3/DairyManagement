import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_permission
from app.models.enums import PartnerStatus, PermissionFeature, PermissionLevel
from app.models.user import User
from app.schemas.business_partner import (
    BankAccountInput,
    BankAccountResponse,
    BusinessPartnerCreateRequest,
    BusinessPartnerDetailResponse,
    BusinessPartnerResponse,
    BusinessPartnerUpdateRequest,
    CapitalContributionInput,
    CapitalContributionResponse,
    CapitalInterestInput,
    CapitalInterestResponse,
    CapitalInterestUpdateRequest,
    DrawingInput,
    DrawingResponse,
    JointLiabilityInput,
    JointLiabilityResponse,
    JointLiabilityUpdateRequest,
    LoanInput,
    LoanResponse,
    LoanUpdateRequest,
    ProfitLossAllocationInput,
    ProfitLossAllocationResponse,
    ProfitLossRatioInput,
    ProfitLossRatioResponse,
    RemunerationInput,
    RemunerationResponse,
    ResponsibilityInput,
    ResponsibilityResponse,
)
from app.services.business_partner_service import BusinessPartnerService

router = APIRouter(prefix="/business-partners", tags=["business-partners"])

view_dep = require_permission(PermissionFeature.BUSINESS_PARTNERS, PermissionLevel.VIEW)
full_dep = require_permission(PermissionFeature.BUSINESS_PARTNERS, PermissionLevel.FULL)


@router.get("")
async def list_partners(
    search: str | None = Query(default=None),
    status: PartnerStatus | None = Query(default=None),
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    partners = await BusinessPartnerService(db).list_partners(search, status)
    return success_envelope([BusinessPartnerResponse.model_validate(p).model_dump() for p in partners])


@router.post("")
async def create_partner(
    payload: BusinessPartnerCreateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    partner = await BusinessPartnerService(db).create_partner(payload, actor.full_name, actor.id)
    return success_envelope(BusinessPartnerResponse.model_validate(partner).model_dump(), "Partner added")


@router.get("/{partner_id}")
async def get_partner(
    partner_id: uuid.UUID,
    _: User = Depends(view_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    partner = await BusinessPartnerService(db).get_partner_detail(partner_id)
    return success_envelope(BusinessPartnerDetailResponse.model_validate(partner).model_dump())


@router.patch("/{partner_id}")
async def update_partner(
    partner_id: uuid.UUID,
    payload: BusinessPartnerUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    partner = await BusinessPartnerService(db).update_partner(partner_id, payload, actor.full_name)
    return success_envelope(BusinessPartnerResponse.model_validate(partner).model_dump(), "Partner updated")


# --- Bank accounts ---

@router.post("/{partner_id}/bank-accounts")
async def add_bank_account(
    partner_id: uuid.UUID,
    payload: BankAccountInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_bank_account(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(BankAccountResponse.model_validate(row).model_dump(), "Bank account added")


@router.patch("/{partner_id}/bank-accounts/{row_id}/primary")
async def set_primary_bank_account(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).set_primary_bank_account(partner_id, row_id, actor.full_name)
    return success_envelope(BankAccountResponse.model_validate(row).model_dump(), "Primary account updated")


@router.delete("/{partner_id}/bank-accounts/{row_id}")
async def delete_bank_account(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_bank_account(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Bank account removed")


# --- Capital contributions ---

@router.post("/{partner_id}/capital-contributions")
async def add_capital_contribution(
    partner_id: uuid.UUID,
    payload: CapitalContributionInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_capital_contribution(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(CapitalContributionResponse.model_validate(row).model_dump(), "Capital contribution added")


@router.delete("/{partner_id}/capital-contributions/{row_id}")
async def delete_capital_contribution(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_capital_contribution(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Capital contribution removed")


# --- Profit & loss ratios ---

@router.post("/{partner_id}/profit-loss-ratios")
async def add_profit_loss_ratio(
    partner_id: uuid.UUID,
    payload: ProfitLossRatioInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_profit_loss_ratio(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(ProfitLossRatioResponse.model_validate(row).model_dump(), "Profit & loss ratio added")


@router.delete("/{partner_id}/profit-loss-ratios/{row_id}")
async def delete_profit_loss_ratio(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_profit_loss_ratio(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Profit & loss ratio removed")


# --- Drawings ---

@router.post("/{partner_id}/drawings")
async def add_drawing(
    partner_id: uuid.UUID,
    payload: DrawingInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_drawing(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(DrawingResponse.model_validate(row).model_dump(), "Drawing recorded")


@router.delete("/{partner_id}/drawings/{row_id}")
async def delete_drawing(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_drawing(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Drawing removed")


# --- Profit & loss allocations ---

@router.post("/{partner_id}/profit-loss-allocations")
async def add_profit_loss_allocation(
    partner_id: uuid.UUID,
    payload: ProfitLossAllocationInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_profit_loss_allocation(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(ProfitLossAllocationResponse.model_validate(row).model_dump(), "Profit/loss allocation recorded")


@router.delete("/{partner_id}/profit-loss-allocations/{row_id}")
async def delete_profit_loss_allocation(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_profit_loss_allocation(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Profit/loss allocation removed")


# --- Remuneration ---

@router.post("/{partner_id}/remunerations")
async def add_remuneration(
    partner_id: uuid.UUID,
    payload: RemunerationInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_remuneration(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(RemunerationResponse.model_validate(row).model_dump(), "Remuneration added")


@router.delete("/{partner_id}/remunerations/{row_id}")
async def delete_remuneration(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_remuneration(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Remuneration removed")


# --- Interest on capital ---

@router.post("/{partner_id}/capital-interest")
async def add_capital_interest(
    partner_id: uuid.UUID,
    payload: CapitalInterestInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_capital_interest(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(CapitalInterestResponse.model_validate(row).model_dump(), "Interest entry added")


@router.patch("/{partner_id}/capital-interest/{row_id}")
async def update_capital_interest(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    payload: CapitalInterestUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).update_capital_interest(partner_id, row_id, payload, actor.full_name)
    return success_envelope(CapitalInterestResponse.model_validate(row).model_dump(), "Interest entry updated")


@router.delete("/{partner_id}/capital-interest/{row_id}")
async def delete_capital_interest(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_capital_interest(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Interest entry removed")


# --- Loans from partners ---

@router.post("/{partner_id}/loans")
async def add_loan(
    partner_id: uuid.UUID,
    payload: LoanInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_loan(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(LoanResponse.model_validate(row).model_dump(), "Loan recorded")


@router.patch("/{partner_id}/loans/{row_id}")
async def update_loan(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    payload: LoanUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).update_loan(partner_id, row_id, payload, actor.full_name)
    return success_envelope(LoanResponse.model_validate(row).model_dump(), "Loan updated")


@router.delete("/{partner_id}/loans/{row_id}")
async def delete_loan(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_loan(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Loan removed")


# --- Joint liabilities ---

@router.post("/{partner_id}/liabilities")
async def add_joint_liability(
    partner_id: uuid.UUID,
    payload: JointLiabilityInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_joint_liability(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(JointLiabilityResponse.model_validate(row).model_dump(), "Liability recorded")


@router.patch("/{partner_id}/liabilities/{row_id}")
async def update_joint_liability(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    payload: JointLiabilityUpdateRequest,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).update_joint_liability(partner_id, row_id, payload, actor.full_name)
    return success_envelope(JointLiabilityResponse.model_validate(row).model_dump(), "Liability updated")


@router.delete("/{partner_id}/liabilities/{row_id}")
async def delete_joint_liability(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_joint_liability(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Liability removed")


# --- Operational responsibilities ---

@router.post("/{partner_id}/responsibilities")
async def add_responsibility(
    partner_id: uuid.UUID,
    payload: ResponsibilityInput,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await BusinessPartnerService(db).add_responsibility(partner_id, payload, actor.full_name, actor.id)
    return success_envelope(ResponsibilityResponse.model_validate(row).model_dump(), "Responsibility added")


@router.delete("/{partner_id}/responsibilities/{row_id}")
async def delete_responsibility(
    partner_id: uuid.UUID,
    row_id: uuid.UUID,
    actor: User = Depends(full_dep),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await BusinessPartnerService(db).delete_responsibility(partner_id, row_id, actor.full_name)
    return success_envelope(None, "Responsibility removed")
