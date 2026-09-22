import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _create_user(db_session: AsyncSession, email: str = "admin@kshirsagar.com") -> User:
    user = User(
        email=email,
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Ramesh Kshirsagar",
        role=UserRole.SUPER_ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_login_success(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_user(db_session)

    response = await client.post(
        "/api/v1/auth/login", json={"email": "admin@kshirsagar.com", "password": "Sup3rSecret!"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]


async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_user(db_session)

    response = await client.post(
        "/api/v1/auth/login", json={"email": "admin@kshirsagar.com", "password": "wrong"}
    )

    assert response.status_code == 401
    assert response.json()["success"] is False


async def test_refresh_token_rotates(client: AsyncClient, db_session: AsyncSession) -> None:
    await _create_user(db_session)
    login_resp = await client.post(
        "/api/v1/auth/login", json={"email": "admin@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    refresh_token = login_resp.json()["data"]["refresh_token"]

    refresh_resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_resp.status_code == 200

    reuse_resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reuse_resp.status_code == 401


async def test_me_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403
