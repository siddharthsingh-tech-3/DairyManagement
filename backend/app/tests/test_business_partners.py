import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    user = User(
        email="partnersadmin@kshirsagar.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Partners Admin",
        role=UserRole.SUPER_ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"email": "partnersadmin@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_create_partner_and_compute_capital_balance(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)

    create_resp = await client.post(
        "/api/v1/business-partners",
        json={
            "name": "Ramesh Kulkarni",
            "address": "123 MG Road, Pune",
            "phone": "9822011111",
            "email": "ramesh@example.com",
            "tin": "TIN12345",
            "pan_number": "ABCDE1234F",
            "opening_capital_balance": "10000",
            "bank_accounts": [
                {
                    "account_number": "1234567890",
                    "account_holder_name": "Ramesh Kulkarni",
                    "bank_name": "State Bank of India",
                    "ifsc_code": "sbin0001234",
                    "branch_name": "MG Road",
                }
            ],
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    partner = create_resp.json()["data"]
    assert partner["current_capital_balance"] == "10000.00" or float(partner["current_capital_balance"]) == 10000
    partner_id = partner["id"]

    await client.post(
        f"/api/v1/business-partners/{partner_id}/capital-contributions",
        json={"contribution_type": "additional", "amount": "5000", "contribution_date": "2026-01-01"},
        headers=headers,
    )
    await client.post(
        f"/api/v1/business-partners/{partner_id}/drawings",
        json={"amount": "2000", "drawing_date": "2026-02-01", "description": "Personal use"},
        headers=headers,
    )
    await client.post(
        f"/api/v1/business-partners/{partner_id}/profit-loss-ratios",
        json={"profit_percentage": "50", "loss_percentage": "50", "effective_date": "2026-01-01"},
        headers=headers,
    )
    await client.post(
        f"/api/v1/business-partners/{partner_id}/loans",
        json={"loan_amount": "3000", "loan_date": "2026-01-15", "loan_status": "active"},
        headers=headers,
    )

    detail_resp = await client.get(f"/api/v1/business-partners/{partner_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()["data"]
    assert float(detail["current_capital_balance"]) == 13000  # 10000 + 5000 - 2000
    assert float(detail["total_capital_contributed"]) == 5000
    assert float(detail["total_drawings"]) == 2000
    assert float(detail["current_profit_percentage"]) == 50
    assert float(detail["total_outstanding_loans"]) == 3000
    assert len(detail["capital_contributions"]) == 1
    assert len(detail["loans"]) == 1

    account = detail["bank_accounts"][0]
    assert account["account_number"] == "1234567890"
    assert account["ifsc_code"] == "SBIN0001234"  # normalised to upper case
    assert account["is_primary"] is True  # the only account supplied becomes the payout default


async def test_create_partner_requires_a_bank_account(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)

    resp = await client.post(
        "/api/v1/business-partners",
        json={"name": "No Bank Partner", "address": "45 FC Road, Pune", "bank_accounts": []},
        headers=headers,
    )
    assert resp.status_code == 422


async def test_additional_contribution_records_expected_interest(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)

    create_resp = await client.post(
        "/api/v1/business-partners",
        json={
            "name": "Suresh Patil",
            "address": "8 Shivaji Nagar, Pune",
            "bank_accounts": [{"account_number": "9876543210"}],
        },
        headers=headers,
    )
    partner_id = create_resp.json()["data"]["id"]

    contribution_resp = await client.post(
        f"/api/v1/business-partners/{partner_id}/capital-contributions",
        json={
            "contribution_type": "additional",
            "amount": "50000",
            "contribution_date": "2026-04-01",
            "note": "Working capital for the chilling plant",
            "interest_rate": "9.5",
            "interest_amount": "4750",
            "interest_calculation_method": "simple",
        },
        headers=headers,
    )
    assert contribution_resp.status_code == 200
    contribution = contribution_resp.json()["data"]
    assert float(contribution["interest_rate"]) == 9.5
    assert float(contribution["interest_amount"]) == 4750
    assert contribution["interest_calculation_method"] == "simple"
    # Falls back to the contribution date when no separate effective date is given.
    assert contribution["interest_effective_date"] == "2026-04-01"

    detail = (await client.get(f"/api/v1/business-partners/{partner_id}", headers=headers)).json()["data"]
    assert float(detail["total_additional_contributed"]) == 50000
    assert float(detail["total_expected_interest"]) == 4750


async def test_interest_details_require_a_rate_or_amount(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)

    create_resp = await client.post(
        "/api/v1/business-partners",
        json={
            "name": "Anita Deshmukh",
            "address": "12 Baner Road, Pune",
            "bank_accounts": [{"account_number": "5555666677"}],
        },
        headers=headers,
    )
    partner_id = create_resp.json()["data"]["id"]

    resp = await client.post(
        f"/api/v1/business-partners/{partner_id}/capital-contributions",
        json={
            "contribution_type": "additional",
            "amount": "10000",
            "contribution_date": "2026-04-01",
            "interest_calculation_method": "compound",
        },
        headers=headers,
    )
    assert resp.status_code == 422


async def test_partner_bank_accounts_can_be_added_switched_and_removed(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)

    create_resp = await client.post(
        "/api/v1/business-partners",
        json={
            "name": "Vikas Jadhav",
            "address": "77 Kothrud, Pune",
            "bank_accounts": [{"account_number": "1111222233", "bank_name": "HDFC Bank"}],
        },
        headers=headers,
    )
    partner_id = create_resp.json()["data"]["id"]
    first_id = (await client.get(f"/api/v1/business-partners/{partner_id}", headers=headers)).json()["data"][
        "bank_accounts"
    ][0]["id"]

    # The last remaining account cannot be removed.
    only_account_resp = await client.delete(
        f"/api/v1/business-partners/{partner_id}/bank-accounts/{first_id}", headers=headers
    )
    assert only_account_resp.status_code == 422

    second = await client.post(
        f"/api/v1/business-partners/{partner_id}/bank-accounts",
        json={"account_number": "4444555566", "bank_name": "ICICI Bank", "is_primary": True},
        headers=headers,
    )
    assert second.status_code == 200
    second_id = second.json()["data"]["id"]

    accounts = (await client.get(f"/api/v1/business-partners/{partner_id}", headers=headers)).json()["data"][
        "bank_accounts"
    ]
    primary_ids = [a["id"] for a in accounts if a["is_primary"]]
    assert primary_ids == [second_id]  # exactly one primary at a time

    await client.patch(
        f"/api/v1/business-partners/{partner_id}/bank-accounts/{first_id}/primary", headers=headers
    )
    accounts = (await client.get(f"/api/v1/business-partners/{partner_id}", headers=headers)).json()["data"][
        "bank_accounts"
    ]
    assert [a["id"] for a in accounts if a["is_primary"]] == [first_id]

    # Removing the primary hands the payout default to the account that remains.
    delete_resp = await client.delete(
        f"/api/v1/business-partners/{partner_id}/bank-accounts/{first_id}", headers=headers
    )
    assert delete_resp.status_code == 200
    accounts = (await client.get(f"/api/v1/business-partners/{partner_id}", headers=headers)).json()["data"][
        "bank_accounts"
    ]
    assert len(accounts) == 1
    assert accounts[0]["id"] == second_id
    assert accounts[0]["is_primary"] is True


async def test_business_partners_requires_permission_for_non_admin(client: AsyncClient, db_session: AsyncSession) -> None:
    vendor_user = User(
        email="partnervendor@kshirsagar.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Some Vendor",
        role=UserRole.VENDOR,
    )
    db_session.add(vendor_user)
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"email": "partnervendor@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    token = login.json()["data"]["access_token"]

    resp = await client.get("/api/v1/business-partners", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
