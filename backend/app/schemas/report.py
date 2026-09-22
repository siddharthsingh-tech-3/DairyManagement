import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class AdminDashboardResponse(BaseModel):
    todays_demand_qty: int
    trucks_in_transit: int
    crates_with_vendors: int
    outstanding_total: Decimal
    vendors_over_limit: int
    open_disputes: int
    draft_orders: int


class VendorDashboardResponse(BaseModel):
    next_delivery_date: date | None
    next_delivery_summary: str | None
    outstanding: Decimal
    credit_available: Decimal
    crates_with_vendor: int
    account_status: str


class DriverDashboardResponse(BaseModel):
    stops_today: int
    packets_loaded: int
    crates_issued: int


class ProfitLossResponse(BaseModel):
    period_month: date
    revenue: Decimal
    expenses_by_category: dict[str, Decimal]
    total_expenses: Decimal
    net_profit: Decimal


class OperationalReportResponse(BaseModel):
    delivery_fulfilment_percent: Decimal
    crate_return_rate_percent: Decimal
    collection_efficiency_percent: Decimal


class AuditLogEntryResponse(BaseModel):
    id: uuid.UUID
    actor_name: str
    action: str
    created_at: datetime


class FinancialSummaryResponse(BaseModel):
    to_collect: Decimal
    to_pay: Decimal
    total_revenue: Decimal
    total_expenses: Decimal
    total_profit: Decimal
    cash_and_bank: Decimal
    invoice_count: int


class SalesTrendPoint(BaseModel):
    date: date
    amount: Decimal


class SalesTrendResponse(BaseModel):
    points: list[SalesTrendPoint]
    invoices_made: int


class LatestTransactionResponse(BaseModel):
    id: uuid.UUID
    date: date
    type: str
    txn_no: str
    party_name: str
    amount: Decimal


class TodaysDemandRowResponse(BaseModel):
    vendor_name: str
    product_name: str
    quantity: int
    order_type: str
