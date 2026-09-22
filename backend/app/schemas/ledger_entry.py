import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import LedgerEntryCategory


class LedgerEntryCreateRequest(BaseModel):
    category: LedgerEntryCategory
    label: str = Field(min_length=1, max_length=150)
    amount: Decimal = Field(gt=0)
    entry_date: date
    note: str | None = None


class LedgerEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: LedgerEntryCategory
    label: str
    amount: Decimal
    entry_date: date
    note: str | None
    created_at: datetime
