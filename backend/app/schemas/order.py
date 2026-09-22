import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import OrderStatus, OrderType, PaymentMethod


class OrderItemCreateRequest(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)
    crates_qty: int = Field(default=0, ge=0)


class OrderCreateRequest(BaseModel):
    vendor_id: uuid.UUID | None = None
    walkin_customer_name: str | None = None
    order_type: OrderType
    recurrence_frequency: str | None = None
    delivery_date: date | None = None
    payment_method: PaymentMethod = PaymentMethod.PAY_LATER
    items: list[OrderItemCreateRequest] = Field(min_length=1)

    @model_validator(mode="after")
    def check_source(self) -> "OrderCreateRequest":
        if self.vendor_id is None and not (self.walkin_customer_name or "").strip():
            raise ValueError("Either vendor_id or walkin_customer_name is required")
        if self.order_type == OrderType.RECURRING and not self.recurrence_frequency:
            raise ValueError("recurrence_frequency is required for recurring orders")
        if self.order_type != OrderType.RECURRING and self.delivery_date is None:
            raise ValueError("delivery_date is required for normal/scheduled orders")
        return self


class OrderUpdateRequest(BaseModel):
    delivery_date: date | None = None
    items: list[OrderItemCreateRequest] = Field(min_length=1)


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    rate_snapshot: Decimal
    gst_percent_snapshot: Decimal
    crates_qty: int
    line_total: Decimal


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_no: str
    vendor_id: uuid.UUID | None
    vendor_name: str | None
    walkin_customer_name: str | None
    is_walkin: bool
    order_type: OrderType
    recurrence_frequency: str | None
    delivery_date: date | None
    status: OrderStatus
    payment_method: PaymentMethod | None
    total_crates: int
    needs_approval: bool
    items: list[OrderItemResponse]
    total_quantity: int
    total_amount: Decimal
    is_editable: bool
    created_at: datetime
