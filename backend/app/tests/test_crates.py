from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.models.vendor import Vendor

pytestmark = pytest.mark.asyncio


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    user = User(
        email="admin4@kshirsagar.com", password_hash=hash_password("Sup3rSecret!"), full_name="Admin", role=UserRole.SUPER_ADMIN
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": "admin4@kshirsagar.com", "password": "Sup3rSecret!"})
    return {"Authorization": f"Bearer {login.json()['data']['access_token']}"}


async def test_crate_reconciliation_updates_balance(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    vendor = Vendor(
        code="V01", name="Gokul Provisions", contact_name="Suresh", phone="9011022876", area="Karve Nagar",
        route="Route 2", credit_limit=25000, vendor_since=date.today(),
    )
    db_session.add(vendor)
    await db_session.commit()
    await db_session.refresh(vendor)

    issue_resp = await client.post(
        "/api/v1/crates/reconcile",
        json={"vendor_id": str(vendor.id), "txn_type": "issue", "quantity": 20, "note": "Full crates loaded"},
        headers=headers,
    )
    assert issue_resp.status_code == 200

    return_resp = await client.post(
        "/api/v1/crates/reconcile",
        json={"vendor_id": str(vendor.id), "txn_type": "return", "quantity": 5, "note": "Empties collected"},
        headers=headers,
    )
    assert return_resp.status_code == 200

    summary_resp = await client.get("/api/v1/crates/summary", headers=headers)
    assert summary_resp.status_code == 200
    row = next(r for r in summary_resp.json()["data"] if r["vendor_id"] == str(vendor.id))
    assert row["given"] == 20
    assert row["returned"] == 5
    assert row["balance"] == 15
