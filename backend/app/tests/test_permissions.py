import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    user = User(
        email="admin6@kshirsagar.com", password_hash=hash_password("Sup3rSecret!"), full_name="Admin", role=UserRole.SUPER_ADMIN
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": "admin6@kshirsagar.com", "password": "Sup3rSecret!"})
    return {"Authorization": f"Bearer {login.json()['data']['access_token']}"}


async def test_permission_matrix_seeds_defaults(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.get("/api/v1/permissions", headers=headers)
    assert resp.status_code == 200
    entries = resp.json()["data"]
    crates_vendor = next(e for e in entries if e["feature"] == "crates" and e["role"] == "vendor")
    assert crates_vendor["level"] == "view"
    crates_driver = next(e for e in entries if e["feature"] == "crates" and e["role"] == "driver")
    assert crates_driver["level"] == "full"


async def test_cycle_permission_rotates_full_view_none(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    # crates/driver starts at "full" per the default seed -> cycles to "view"
    resp = await client.post("/api/v1/permissions/crates/driver/cycle", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["level"] == "view"

    resp2 = await client.post("/api/v1/permissions/crates/driver/cycle", headers=headers)
    assert resp2.json()["data"]["level"] == "none"
