from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import success_envelope
from app.dependencies.db import get_db
from app.dependencies.permissions import require_admin
from app.models.user import User
from app.schemas.driver import DriverCreateRequest, DriverResponse
from app.services.driver_service import DriverService

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("")
async def list_drivers(_: User = Depends(require_admin), db: AsyncSession = Depends(get_db)) -> dict:
    drivers = await DriverService(db).list_drivers()
    return success_envelope([DriverResponse.model_validate(d).model_dump() for d in drivers])


@router.post("")
async def create_driver(
    payload: DriverCreateRequest,
    actor: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    driver = await DriverService(db).create_driver(payload, actor.full_name)
    return success_envelope(DriverResponse.model_validate(driver).model_dump(), "Driver added")
