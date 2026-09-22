import uuid
from decimal import Decimal

from pydantic import BaseModel


class TransportSummaryResponse(BaseModel):
    total_transport: int
    own_count: int
    rented_count: int
    total_km_running: Decimal
    total_bill_amount: Decimal


class ZoneWiseReportRow(BaseModel):
    zone_id: uuid.UUID
    zone_name: str
    bill_count: int
    total_amount: Decimal


class CategoryWiseReportRow(BaseModel):
    category_id: uuid.UUID
    category_name: str
    bill_count: int
    total_amount: Decimal
