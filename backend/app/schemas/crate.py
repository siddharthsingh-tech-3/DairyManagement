import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CrateTxnType, DisputeStatus


class CrateTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vendor_id: uuid.UUID
    vendor_name: str
    txn_type: CrateTxnType
    quantity: int
    note: str | None
    created_at: datetime


class CrateSummaryResponse(BaseModel):
    vendor_id: uuid.UUID
    vendor_name: str
    given: int
    returned: int
    balance: int
    broken: int


class CrateReconciliationRequest(BaseModel):
    vendor_id: uuid.UUID
    txn_type: CrateTxnType
    quantity: int = Field(gt=0)
    note: str | None = None


class CrateDisputeCreateRequest(BaseModel):
    vendor_id: uuid.UUID
    related_delivery_id: uuid.UUID | None = None
    driver_reported_qty: int
    vendor_confirmed_qty: int


class CrateDisputeResolveRequest(BaseModel):
    resolution_note: str


class CrateDisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    vendor_id: uuid.UUID
    vendor_name: str
    driver_reported_qty: int
    vendor_confirmed_qty: int
    status: DisputeStatus
    resolution_note: str | None
    created_at: datetime
