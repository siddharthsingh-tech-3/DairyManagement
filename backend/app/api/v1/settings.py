from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_admin
from app.models.user import User
from app.schemas.business_setting import BusinessSettingResponse, BusinessSettingUpsertRequest
from app.services.business_setting_service import BusinessSettingService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def list_settings(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> dict:
    settings_list = await BusinessSettingService(db).list_settings()
    return success_envelope([BusinessSettingResponse.model_validate(s).model_dump() for s in settings_list])


@router.put("")
async def upsert_setting(
    payload: BusinessSettingUpsertRequest,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    setting = await BusinessSettingService(db).upsert(payload.key, payload.value, actor.full_name)
    return success_envelope(BusinessSettingResponse.model_validate(setting).model_dump(), "Setting updated")
