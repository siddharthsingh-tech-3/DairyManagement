from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.product import Product
from app.models.user import User
from app.models.vendor import Vendor

pytestmark = pytest.mark.asyncio


async def _admin_headers(client: AsyncClient, db_session: AsyncSession, email: str = "admin3@kshirsagar.com") -> dict:
    user = User(email=email, password_hash=hash_password("Sup3rSecret!"), full_name="Admin", role=UserRole.SUPER_ADMIN)
    db_session.add(user)
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "Sup3rSecret!"})
    return {"Authorization": f"Bearer {login.json()['data']['access_token']}"}


async def _make_vendor_and_product(db_session: AsyncSession, credit_limit: Decimal = Decimal("50000")) -> tuple[Vendor, Product]:
    vendor = Vendor(
        code="V01", name="Sharma Dairy Point", contact_name="Rajesh", phone="9822041122", area="Kothrud",
        route="Route 1", credit_limit=credit_limit, vendor_since=date.today(),
    )
    product = Product(sku="MLK-TND-500", name="Toned Milk 500ml", hsn_code="0401", rate=Decimal("27"), gst_percent=Decimal("5"), current_stock=500)
    db_session.add_all([vendor, product])
    await db_session.commit()
    await db_session.refresh(vendor)
    await db_session.refresh(product)
    return vendor, product


async def test_order_rejects_past_delivery_date(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    vendor, product = await _make_vendor_and_product(db_session)

    resp = await client.post(
        "/api/v1/orders",
        json={
            "vendor_id": str(vendor.id),
            "order_type": "normal",
            "delivery_date": str(date.today() - timedelta(days=1)),
            "payment_method": "pay_later",
            "items": [{"product_id": str(product.id), "quantity": 100, "crates_qty": 4}],
        },
        headers=headers,
    )
    assert resp.status_code == 422
    assert resp.json()["success"] is False


async def test_order_creation_flags_needs_approval_over_credit_limit(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    vendor, product = await _make_vendor_and_product(db_session, credit_limit=Decimal("100"))

    resp = await client.post(
        "/api/v1/orders",
        json={
            "vendor_id": str(vendor.id),
            "order_type": "normal",
            "delivery_date": str(date.today() + timedelta(days=5)),
            "payment_method": "pay_later",
            "items": [{"product_id": str(product.id), "quantity": 100, "crates_qty": 4}],
        },
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["needs_approval"] is True
    assert data["order_no"].startswith("ORD-")
    assert data["total_quantity"] == 100

    await db_session.refresh(vendor)
    assert vendor.outstanding_balance > 0  # pay_later posts a ledger debit
