from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import InterestCalculationMethod, RepaymentFrequency, UserRole
from app.models.user import User
from app.services.loan_service import _add_months, generate_schedule

# --- Unit tests: pure schedule-generation logic, no DB ---


def test_generate_schedule_simple_interest_equal_installments() -> None:
    rows, total_interest = generate_schedule(
        principal=Decimal("12000"),
        annual_rate=Decimal("12"),
        tenure_months=12,
        frequency=RepaymentFrequency.MONTHLY,
        first_repayment_date=date(2026, 1, 1),
        method=InterestCalculationMethod.SIMPLE,
        tax_rate=None,
    )
    assert len(rows) == 12
    assert total_interest == Decimal("1440.00")
    assert rows[0]["principal_component"] == Decimal("1000.00")
    assert rows[0]["interest_component"] == Decimal("120.00")
    assert rows[0]["tax_component"] == Decimal("0.00")
    assert rows[0]["opening_principal"] == Decimal("12000")
    assert rows[0]["due_date"] == date(2026, 1, 1)
    assert rows[1]["due_date"] == date(2026, 2, 1)
    assert sum(r["principal_component"] for r in rows) == Decimal("12000.00")


def test_generate_schedule_compound_interest_reducing_balance() -> None:
    rows, total_interest = generate_schedule(
        principal=Decimal("12000"),
        annual_rate=Decimal("12"),
        tenure_months=12,
        frequency=RepaymentFrequency.MONTHLY,
        first_repayment_date=date(2026, 1, 1),
        method=InterestCalculationMethod.COMPOUND,
        tax_rate=None,
    )
    assert len(rows) == 12
    assert sum(r["principal_component"] for r in rows) == Decimal("12000.00")
    # Reducing-balance interest strictly decreases installment over installment.
    assert rows[0]["interest_component"] > rows[-1]["interest_component"]
    assert total_interest > 0


def test_generate_schedule_no_interest_loan_zero_rate() -> None:
    rows, total_interest = generate_schedule(
        principal=Decimal("6000"),
        annual_rate=Decimal("0"),
        tenure_months=6,
        frequency=RepaymentFrequency.MONTHLY,
        first_repayment_date=date(2026, 1, 1),
        method=InterestCalculationMethod.COMPOUND,
        tax_rate=None,
    )
    assert total_interest == Decimal("0")
    assert all(r["interest_component"] == Decimal("0.00") for r in rows)
    assert sum(r["principal_component"] for r in rows) == Decimal("6000.00")


def test_generate_schedule_last_installment_absorbs_rounding_remainder() -> None:
    rows, _ = generate_schedule(
        principal=Decimal("1000"),
        annual_rate=Decimal("10"),
        tenure_months=3,
        frequency=RepaymentFrequency.MONTHLY,
        first_repayment_date=date(2026, 1, 1),
        method=InterestCalculationMethod.SIMPLE,
        tax_rate=None,
    )
    assert rows[0]["principal_component"] == Decimal("333.33")
    assert rows[1]["principal_component"] == Decimal("333.33")
    assert rows[2]["principal_component"] == Decimal("333.34")
    assert sum(r["principal_component"] for r in rows) == Decimal("1000.00")


def test_generate_schedule_tax_component_computed_from_tax_rate() -> None:
    rows, _ = generate_schedule(
        principal=Decimal("12000"),
        annual_rate=Decimal("12"),
        tenure_months=12,
        frequency=RepaymentFrequency.MONTHLY,
        first_repayment_date=date(2026, 1, 1),
        method=InterestCalculationMethod.SIMPLE,
        tax_rate=Decimal("10"),
    )
    assert rows[0]["interest_component"] == Decimal("120.00")
    assert rows[0]["tax_component"] == Decimal("12.00")


def test_add_months_handles_end_of_month_clamping() -> None:
    assert _add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert _add_months(date(2026, 1, 15), 1) == date(2026, 2, 15)
    assert _add_months(date(2026, 12, 31), 2) == date(2027, 2, 28)


# --- Integration/API tests ---


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    user = User(
        email="loansadmin@kshirsagar.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Loans Admin",
        role=UserRole.SUPER_ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"email": "loansadmin@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _loan_payload(**overrides) -> dict:
    payload = {
        "loan_type": "taken",
        "party_type": "other",
        "party_name": "ABC Finance Ltd",
        "principal_amount": "120000",
        "loan_date": "2026-01-01",
        "disbursement_method": "bank",
        "interest_rate": "12",
        "interest_type": "simple",
        "tenure_months": 12,
        "repayment_frequency": "monthly",
        "first_repayment_date": "2026-02-01",
        "notes": "Working capital loan",
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_create_loan_taken_generates_schedule_and_posts_disbursement_entry(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)

    resp = await client.post("/api/v1/loans", json=_loan_payload(), headers=headers)
    assert resp.status_code == 200
    loan = resp.json()["data"]
    assert loan["loan_type"] == "taken"
    assert loan["party_name"] == "ABC Finance Ltd"
    assert float(loan["outstanding_principal"]) == 120000
    assert loan["maturity_date"] == "2027-01-01"
    assert len(loan["installments"]) == 12
    assert len(loan["ledger_entries"]) == 1
    assert loan["ledger_entries"][0]["entry_type"] == "disbursement"
    assert float(loan["ledger_entries"][0]["debit"]) == 120000


@pytest.mark.asyncio
async def test_create_loan_given_generates_schedule_and_posts_disbursement_entry(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)

    resp = await client.post(
        "/api/v1/loans",
        json=_loan_payload(loan_type="given", party_name="Local Retailer", disbursement_method="cash"),
        headers=headers,
    )
    assert resp.status_code == 200
    loan = resp.json()["data"]
    assert loan["loan_type"] == "given"
    assert float(loan["outstanding_principal"]) == 120000


@pytest.mark.asyncio
async def test_create_loan_requires_party_name_when_party_type_other(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    payload = _loan_payload()
    payload.pop("party_name")
    resp = await client.post("/api/v1/loans", json=payload, headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_loan_rejects_zero_or_negative_principal(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.post("/api/v1/loans", json=_loan_payload(principal_amount="0"), headers=headers)
    assert resp.status_code == 422
    resp = await client.post("/api/v1/loans", json=_loan_payload(principal_amount="-500"), headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_loan_rejects_negative_interest_rate(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.post("/api/v1/loans", json=_loan_payload(interest_rate="-1"), headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_loan_rejects_zero_tenure(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.post("/api/v1/loans", json=_loan_payload(tenure_months=0), headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_loan_maturity_date_ignores_client_supplied_value_and_is_computed(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/api/v1/loans", json=_loan_payload(maturity_date="2099-01-01"), headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["maturity_date"] == "2027-01-01"


@pytest.mark.asyncio
async def test_list_loans_filters_by_type_and_status(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    await client.post("/api/v1/loans", json=_loan_payload(loan_type="taken"), headers=headers)
    await client.post("/api/v1/loans", json=_loan_payload(loan_type="given", party_name="Retailer X"), headers=headers)

    resp = await client.get("/api/v1/loans", params={"loan_type": "given"}, headers=headers)
    assert resp.status_code == 200
    rows = resp.json()["data"]
    assert len(rows) == 1
    assert rows[0]["loan_type"] == "given"


@pytest.mark.asyncio
async def test_record_full_payment_closes_installment_and_updates_outstanding(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post(
        "/api/v1/loans",
        json=_loan_payload(principal_amount="1200", interest_rate="12", tenure_months=1, repayment_frequency="monthly"),
        headers=headers,
    )
    loan = create_resp.json()["data"]
    installment = loan["installments"][0]
    assert float(installment["total_installment_amount"]) == 1212.00  # 1200 principal + 12 interest

    pay_resp = await client.post(
        f"/api/v1/loans/{loan['id']}/repayments",
        json={
            "installment_id": installment["id"],
            "payment_date": "2026-02-01",
            "method": "bank",
            "principal_amount": "1200",
            "interest_amount": "12",
        },
        headers=headers,
    )
    assert pay_resp.status_code == 200

    detail_resp = await client.get(f"/api/v1/loans/{loan['id']}", headers=headers)
    detail = detail_resp.json()["data"]
    assert float(detail["outstanding_principal"]) == 0
    assert detail["status"] == "closed"
    assert detail["installments"][0]["status"] == "paid"


@pytest.mark.asyncio
async def test_record_partial_payment_marks_installment_partially_paid(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post(
        "/api/v1/loans",
        json=_loan_payload(principal_amount="1200", interest_rate="12", tenure_months=1, repayment_frequency="monthly"),
        headers=headers,
    )
    loan = create_resp.json()["data"]
    installment = loan["installments"][0]

    pay_resp = await client.post(
        f"/api/v1/loans/{loan['id']}/repayments",
        json={
            "installment_id": installment["id"],
            "payment_date": "2026-02-01",
            "method": "bank",
            "principal_amount": "600",
        },
        headers=headers,
    )
    assert pay_resp.status_code == 200

    detail_resp = await client.get(f"/api/v1/loans/{loan['id']}", headers=headers)
    detail = detail_resp.json()["data"]
    assert detail["installments"][0]["status"] == "partially_paid"
    assert float(detail["outstanding_principal"]) == 600
    assert detail["status"] == "active"


@pytest.mark.asyncio
async def test_record_payment_exceeding_outstanding_returns_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post("/api/v1/loans", json=_loan_payload(principal_amount="1000"), headers=headers)
    loan = create_resp.json()["data"]

    resp = await client.post(
        f"/api/v1/loans/{loan['id']}/repayments",
        json={"payment_date": "2026-02-01", "method": "bank", "principal_amount": "5000"},
        headers=headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_record_payment_splits_principal_interest_tax_into_separate_ledger_entries(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post(
        "/api/v1/loans",
        json=_loan_payload(principal_amount="1200", interest_rate="12", tenure_months=1, tax_rate="10"),
        headers=headers,
    )
    loan = create_resp.json()["data"]

    # Gross interest due is 12.00; 1.20 of it is withheld as TDS, leaving 10.80 net
    # interest paid — principal_amount + interest_amount + tax_amount must not double
    # count the withheld portion against outstanding_interest (which tracks gross interest).
    resp = await client.post(
        f"/api/v1/loans/{loan['id']}/repayments",
        json={
            "payment_date": "2026-02-01",
            "method": "bank",
            "principal_amount": "1200",
            "interest_amount": "10.8",
            "tax_amount": "1.2",
        },
        headers=headers,
    )
    assert resp.status_code == 200

    ledger_resp = await client.get(f"/api/v1/loans/{loan['id']}/ledger-entries", headers=headers)
    entry_types = {e["entry_type"] for e in ledger_resp.json()["data"]}
    assert entry_types == {"disbursement", "principal_repayment", "interest_repayment", "tax_deduction"}


@pytest.mark.asyncio
async def test_cancel_loan_with_no_repayments_zeroes_outstanding(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post("/api/v1/loans", json=_loan_payload(), headers=headers)
    loan = create_resp.json()["data"]

    resp = await client.post(f"/api/v1/loans/{loan['id']}/cancel", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "cancelled"
    assert float(data["outstanding_principal"]) == 0


@pytest.mark.asyncio
async def test_cancel_loan_with_repayments_returns_422(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post("/api/v1/loans", json=_loan_payload(principal_amount="1000"), headers=headers)
    loan = create_resp.json()["data"]
    await client.post(
        f"/api/v1/loans/{loan['id']}/repayments",
        json={"payment_date": "2026-02-01", "method": "bank", "principal_amount": "100"},
        headers=headers,
    )

    resp = await client.post(f"/api/v1/loans/{loan['id']}/cancel", headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_delete_loan_with_repayments_returns_422(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post("/api/v1/loans", json=_loan_payload(principal_amount="1000"), headers=headers)
    loan = create_resp.json()["data"]
    await client.post(
        f"/api/v1/loans/{loan['id']}/repayments",
        json={"payment_date": "2026-02-01", "method": "bank", "principal_amount": "100"},
        headers=headers,
    )

    resp = await client.delete(f"/api/v1/loans/{loan['id']}", headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_delete_loan_without_repayments_succeeds(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    create_resp = await client.post("/api/v1/loans", json=_loan_payload(), headers=headers)
    loan = create_resp.json()["data"]

    resp = await client.delete(f"/api/v1/loans/{loan['id']}", headers=headers)
    assert resp.status_code == 200

    get_resp = await client.get(f"/api/v1/loans/{loan['id']}", headers=headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_loans_requires_permission_for_non_admin(client: AsyncClient, db_session: AsyncSession) -> None:
    vendor_user = User(
        email="loansvendor@kshirsagar.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Some Vendor",
        role=UserRole.VENDOR,
    )
    db_session.add(vendor_user)
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"email": "loansvendor@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    token = login.json()["data"]["access_token"]

    resp = await client.get("/api/v1/loans", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
