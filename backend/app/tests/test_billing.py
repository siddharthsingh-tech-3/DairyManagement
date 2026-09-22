from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import OrderStatus, OrderType, UserRole
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.models.vendor import Vendor

pytestmark = pytest.mark.asyncio


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    user = User(
        email="admin5@kshirsagar.com", password_hash=hash_password("Sup3rSecret!"), full_name="Admin", role=UserRole.SUPER_ADMIN
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": "admin5@kshirsagar.com", "password": "Sup3rSecret!"})
    return {"Authorization": f"Bearer {login.json()['data']['access_token']}"}


async def test_generate_invoice_computes_gst(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)

    vendor = Vendor(
        code="V01", name="Sharma Dairy Point", contact_name="Rajesh", phone="9822041122", area="Kothrud",
        route="Route 1", credit_limit=Decimal("50000"), vendor_since=date.today(),
    )
    product = Product(sku="MLK-TND-500", name="Toned Milk 500ml", hsn_code="0401", rate=Decimal("27"), gst_percent=Decimal("5"), current_stock=1000)
    db_session.add_all([vendor, product])
    await db_session.flush()

    period_day = date.today().replace(day=1)
    order = Order(
        order_no="ORD-9001",
        vendor_id=vendor.id,
        order_type=OrderType.NORMAL,
        delivery_date=period_day,
        status=OrderStatus.DELIVERED,
    )
    order.items.append(OrderItem(product_id=product.id, quantity=100, rate_snapshot=product.rate, gst_percent_snapshot=product.gst_percent, crates_qty=4))
    db_session.add(order)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/billing/invoices/generate",
        json={"vendor_id": str(vendor.id), "period_month": str(period_day)},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    subtotal = Decimal("2700")  # 100 * 27
    assert Decimal(data["subtotal"]) == subtotal
    assert Decimal(data["cgst"]) == (subtotal * Decimal("2.5") / 100).quantize(Decimal("0.01"))
    assert Decimal(data["sgst"]) == (subtotal * Decimal("2.5") / 100).quantize(Decimal("0.01"))
    assert Decimal(data["total"]) == subtotal + Decimal(data["cgst"]) + Decimal(data["sgst"])
    assert data["status"] == "due"


async def test_generate_invoice_fails_with_no_orders(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    vendor = Vendor(
        code="V02", name="Anand Milk Corner", contact_name="Anand", phone="9970055340", area="Deccan",
        route="Route 1", credit_limit=Decimal("40000"), vendor_since=date.today(),
    )
    db_session.add(vendor)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/billing/invoices/generate",
        json={"vendor_id": str(vendor.id), "period_month": str(date.today().replace(day=1))},
        headers=headers,
    )
    assert resp.status_code == 422
