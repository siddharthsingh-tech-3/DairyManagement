import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import StockMovementType

ItemType = Literal["product", "service"]


class ProductCreateRequest(BaseModel):
    sku: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=150)
    item_type: ItemType = "product"
    category: str | None = Field(default=None, max_length=50)
    hsn_code: str = Field(default="", max_length=10)
    rate: Decimal = Field(gt=0)
    purchase_price: Decimal | None = Field(default=None, ge=0)
    sales_price_includes_tax: bool = True
    purchase_price_includes_tax: bool = True
    gst_percent: Decimal = Field(default=Decimal("5.0"), ge=0, le=100)
    discount_percent: Decimal | None = Field(default=None, ge=0, le=100)
    unit: str = "pkt"
    alternative_unit: str | None = Field(default=None, max_length=20)
    reorder_level: int = Field(default=0, ge=0)
    low_stock_alert_enabled: bool = False
    current_stock: int = Field(default=0, ge=0)
    opening_stock_date: date | None = None
    show_in_online_store: bool = False
    batch_no: str | None = None
    expiry_date: date | None = None
    description: str | None = None


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    item_type: ItemType | None = None
    category: str | None = None
    hsn_code: str | None = None
    rate: Decimal | None = Field(default=None, gt=0)
    purchase_price: Decimal | None = Field(default=None, ge=0)
    sales_price_includes_tax: bool | None = None
    purchase_price_includes_tax: bool | None = None
    gst_percent: Decimal | None = Field(default=None, ge=0, le=100)
    discount_percent: Decimal | None = Field(default=None, ge=0, le=100)
    unit: str | None = None
    alternative_unit: str | None = None
    reorder_level: int | None = Field(default=None, ge=0)
    low_stock_alert_enabled: bool | None = None
    opening_stock_date: date | None = None
    show_in_online_store: bool | None = None
    batch_no: str | None = None
    expiry_date: date | None = None
    description: str | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sku: str
    name: str
    item_type: ItemType
    category: str | None
    hsn_code: str
    rate: Decimal
    purchase_price: Decimal | None
    sales_price_includes_tax: bool
    purchase_price_includes_tax: bool
    gst_percent: Decimal
    discount_percent: Decimal | None
    unit: str
    alternative_unit: str | None
    current_stock: int
    opening_stock_date: date | None
    reorder_level: int
    low_stock_alert_enabled: bool
    show_in_online_store: bool
    batch_no: str | None
    expiry_date: date | None
    description: str | None
    is_active: bool
    is_low_stock: bool


class ProductBulkCreateRequest(BaseModel):
    items: list[ProductCreateRequest] = Field(min_length=1)


class ProductBulkUpdateRequest(BaseModel):
    ids: list[uuid.UUID] = Field(min_length=1)
    updates: ProductUpdateRequest


class StockAdjustmentRequest(BaseModel):
    movement_type: StockMovementType
    quantity_delta: int
    note: str | None = None


class StockMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    movement_type: StockMovementType
    quantity_delta: int
    note: str | None
    created_at: datetime
