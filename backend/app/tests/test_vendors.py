import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    user = User(
        email="admin2@kshirsagar.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Admin Two",
        role=UserRole.SUPER_ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"email": "admin2@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_create_and_list_vendor(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)

    create_resp = await client.post(
        "/api/v1/vendors",
        json={
            "name": "Sharma Dairy Point",
            "contact_name": "Rajesh Sharma",
            "phone": "9822041122",
            "area": "Kothrud",
            "route": "Route 1",
            "credit_limit": "50000",
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    vendor = create_resp.json()["data"]
    assert vendor["code"] == "V01"
    assert vendor["outstanding_balance"] == "0.00" or float(vendor["outstanding_balance"]) == 0

    list_resp = await client.get("/api/v1/vendors", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1


async def test_vendor_requires_permission_for_non_admin(client: AsyncClient, db_session: AsyncSession) -> None:
    vendor_user = User(
        email="vendoruser@kshirsagar.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Some Vendor",
        role=UserRole.VENDOR,
    )
    db_session.add(vendor_user)
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"email": "vendoruser@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    token = login.json()["data"]["access_token"]

    resp = await client.get("/api/v1/vendors", headers={"Authorization": f"Bearer {token}"})
    # Default seed gives vendor role "none" on the vendors feature.
    assert resp.status_code == 403
