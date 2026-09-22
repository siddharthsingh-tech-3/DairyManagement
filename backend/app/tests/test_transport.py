import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

pytestmark = pytest.mark.asyncio


async def _admin_headers(client: AsyncClient, db_session: AsyncSession) -> dict:
    user = User(
        email="transportadmin@kshirsagar.com",
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Transport Admin",
        role=UserRole.SUPER_ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post(
        "/api/v1/auth/login", json={"email": "transportadmin@kshirsagar.com", "password": "Sup3rSecret!"}
    )
    token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _non_admin_headers(
    client: AsyncClient, db_session: AsyncSession, role: UserRole, email: str
) -> dict:
    user = User(
        email=email,
        password_hash=hash_password("Sup3rSecret!"),
        full_name="Non Admin",
        role=role,
    )
    db_session.add(user)
    await db_session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": "Sup3rSecret!"})
    token = login.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_zone(client: AsyncClient, headers: dict, name: str) -> str:
    resp = await client.post("/api/v1/transport-zones", json={"name": name}, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


async def _create_category(client: AsyncClient, headers: dict, name: str) -> str:
    resp = await client.post("/api/v1/purchase-item-categories", json={"name": name}, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


async def _create_transport(
    client: AsyncClient, headers: dict, vehicle_number: str, ownership: str = "own"
) -> str:
    resp = await client.post(
        "/api/v1/transports",
        json={
            "name": "Truck A",
            "vehicle_number": vehicle_number,
            "ownership": ownership,
            "measure": "tons",
            "transport_average": "10.50",
            "diesel_average": "8.25",
            "km_running_track": "1500.00",
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


# --- Transport master CRUD & validation ---


async def test_create_transport_success(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/api/v1/transports",
        json={
            "name": "Mahindra Bolero",
            "vehicle_number": "MH12AB1234",
            "ownership": "own",
            "measure": "liters",
            "transport_average": "12.00",
            "diesel_average": "9.50",
            "km_running_track": "2500.75",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["name"] == "Mahindra Bolero"
    assert data["vehicle_number"] == "MH12AB1234"
    assert data["ownership"] == "own"


async def test_create_transport_missing_fields_returns_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/api/v1/transports",
        json={"vehicle_number": "MH12AB0001", "ownership": "own", "measure": "liters"},
        headers=headers,
    )
    assert resp.status_code == 422

    resp2 = await client.post(
        "/api/v1/transports",
        json={"name": "Truck", "ownership": "own", "measure": "liters"},
        headers=headers,
    )
    assert resp2.status_code == 422

    resp3 = await client.post(
        "/api/v1/transports",
        json={"name": "Truck", "vehicle_number": "MH12AB0002", "measure": "liters"},
        headers=headers,
    )
    assert resp3.status_code == 422


async def test_create_transport_negative_average_returns_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.post(
        "/api/v1/transports",
        json={
            "name": "Truck",
            "vehicle_number": "MH12AB0003",
            "ownership": "own",
            "measure": "liters",
            "transport_average": "-5",
            "diesel_average": "8",
            "km_running_track": "100",
        },
        headers=headers,
    )
    assert resp.status_code == 422

    resp2 = await client.post(
        "/api/v1/transports",
        json={
            "name": "Truck",
            "vehicle_number": "MH12AB0004",
            "ownership": "own",
            "measure": "liters",
            "transport_average": "5",
            "diesel_average": "8",
            "km_running_track": "-100",
        },
        headers=headers,
    )
    assert resp2.status_code == 422


async def test_duplicate_vehicle_number_returns_409(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    await _create_transport(client, headers, "MH12DUP001")
    resp = await client.post(
        "/api/v1/transports",
        json={
            "name": "Another Truck",
            "vehicle_number": "MH12DUP001",
            "ownership": "rent",
            "measure": "liters",
            "transport_average": "10",
            "diesel_average": "8",
            "km_running_track": "100",
        },
        headers=headers,
    )
    assert resp.status_code == 409


async def test_get_update_delete_transport(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12UPD001")

    get_resp = await client.get(f"/api/v1/transports/{transport_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["vehicle_number"] == "MH12UPD001"

    put_resp = await client.put(
        f"/api/v1/transports/{transport_id}",
        json={
            "name": "Renamed Truck",
            "vehicle_number": "MH12UPD001",
            "ownership": "rent",
            "measure": "kg",
            "transport_average": "20",
            "diesel_average": "15",
            "km_running_track": "500",
        },
        headers=headers,
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["data"]["name"] == "Renamed Truck"
    assert put_resp.json()["data"]["ownership"] == "rent"

    delete_resp = await client.delete(f"/api/v1/transports/{transport_id}", headers=headers)
    assert delete_resp.status_code == 200

    missing_resp = await client.get(f"/api/v1/transports/{transport_id}", headers=headers)
    assert missing_resp.status_code == 404


async def test_get_unknown_transport_returns_404(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    resp = await client.get(f"/api/v1/transports/{uuid.uuid4()}", headers=headers)
    assert resp.status_code == 404


async def test_delete_transport_blocked_while_bills_reference_it(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12BLK001")
    zone_id = await _create_zone(client, headers, "Zone Blocked")
    category_id = await _create_category(client, headers, "Category Blocked")

    bill_resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "bill_date": "2026-06-01",
            "transport_id": transport_id,
            "zone_id": zone_id,
            "purchase_item_category_id": category_id,
            "amount": "500",
        },
        headers=headers,
    )
    assert bill_resp.status_code == 200

    delete_resp = await client.delete(f"/api/v1/transports/{transport_id}", headers=headers)
    assert delete_resp.status_code == 422


# --- Transport bill CRUD & validation ---


async def test_create_transport_bill_success_autofills_vehicle_number(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12BILL01")
    zone_id = await _create_zone(client, headers, "Zone Bill Create")
    category_id = await _create_category(client, headers, "Category Bill Create")

    resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "bill_date": "2026-06-01",
            "transport_id": transport_id,
            "zone_id": zone_id,
            "purchase_item_category_id": category_id,
            "bill_number": "TB-1",
            "amount": "750.50",
            "note": "Fuel and toll",
        },
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["vehicle_number"] == "MH12BILL01"
    assert data["transport_name"] == "Truck A"
    assert data["zone_name"] == "Zone Bill Create"
    assert data["category_name"] == "Category Bill Create"


async def test_create_transport_bill_missing_bill_date_returns_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12BILL02")
    zone_id = await _create_zone(client, headers, "Zone Missing Date")
    category_id = await _create_category(client, headers, "Category Missing Date")

    resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "transport_id": transport_id,
            "zone_id": zone_id,
            "purchase_item_category_id": category_id,
            "amount": "100",
        },
        headers=headers,
    )
    assert resp.status_code == 422


async def test_create_transport_bill_negative_amount_returns_422(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12BILL03")
    zone_id = await _create_zone(client, headers, "Zone Negative Amount")
    category_id = await _create_category(client, headers, "Category Negative Amount")

    resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "bill_date": "2026-06-01",
            "transport_id": transport_id,
            "zone_id": zone_id,
            "purchase_item_category_id": category_id,
            "amount": "-10",
        },
        headers=headers,
    )
    assert resp.status_code == 422


async def test_create_transport_bill_unknown_transport_returns_404(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    zone_id = await _create_zone(client, headers, "Zone Unknown Transport")
    category_id = await _create_category(client, headers, "Category Unknown Transport")

    resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "bill_date": "2026-06-01",
            "transport_id": str(uuid.uuid4()),
            "zone_id": zone_id,
            "purchase_item_category_id": category_id,
            "amount": "100",
        },
        headers=headers,
    )
    assert resp.status_code == 404


async def test_create_transport_bill_unknown_zone_returns_404(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12BILL04")
    category_id = await _create_category(client, headers, "Category Unknown Zone")

    resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "bill_date": "2026-06-01",
            "transport_id": transport_id,
            "zone_id": str(uuid.uuid4()),
            "purchase_item_category_id": category_id,
            "amount": "100",
        },
        headers=headers,
    )
    assert resp.status_code == 404


async def test_create_transport_bill_unknown_category_returns_404(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12BILL05")
    zone_id = await _create_zone(client, headers, "Zone Unknown Category")

    resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "bill_date": "2026-06-01",
            "transport_id": transport_id,
            "zone_id": zone_id,
            "purchase_item_category_id": str(uuid.uuid4()),
            "amount": "100",
        },
        headers=headers,
    )
    assert resp.status_code == 404


async def test_update_and_delete_transport_bill(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12BILL06")
    zone_id = await _create_zone(client, headers, "Zone Update Delete")
    category_id = await _create_category(client, headers, "Category Update Delete")

    create_resp = await client.post(
        "/api/v1/transport-bills",
        json={
            "bill_date": "2026-06-01",
            "transport_id": transport_id,
            "zone_id": zone_id,
            "purchase_item_category_id": category_id,
            "amount": "100",
        },
        headers=headers,
    )
    bill_id = create_resp.json()["data"]["id"]

    update_resp = await client.put(
        f"/api/v1/transport-bills/{bill_id}",
        json={
            "bill_date": "2026-06-15",
            "transport_id": transport_id,
            "zone_id": zone_id,
            "purchase_item_category_id": category_id,
            "amount": "250",
            "bill_number": "TB-UPD",
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert float(update_resp.json()["data"]["amount"]) == 250
    assert update_resp.json()["data"]["bill_number"] == "TB-UPD"

    delete_resp = await client.delete(f"/api/v1/transport-bills/{bill_id}", headers=headers)
    assert delete_resp.status_code == 200

    missing_resp = await client.get(f"/api/v1/transport-bills/{bill_id}", headers=headers)
    assert missing_resp.status_code == 404


# --- Date-range filtering ---


async def test_transport_bills_date_range_filtering(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12RANGE1")
    zone_id = await _create_zone(client, headers, "Zone Range")
    category_id = await _create_category(client, headers, "Category Range")

    for bill_date in ("2026-01-10", "2026-03-10", "2026-05-10"):
        resp = await client.post(
            "/api/v1/transport-bills",
            json={
                "bill_date": bill_date,
                "transport_id": transport_id,
                "zone_id": zone_id,
                "purchase_item_category_id": category_id,
                "amount": "100",
            },
            headers=headers,
        )
        assert resp.status_code == 200

    filtered_resp = await client.get(
        "/api/v1/transport-bills", params={"start": "2026-03-01", "end": "2026-03-31"}, headers=headers
    )
    assert filtered_resp.status_code == 200
    rows = filtered_resp.json()["data"]
    assert len(rows) == 1
    assert rows[0]["bill_date"] == "2026-03-10"

    unfiltered_resp = await client.get("/api/v1/transport-bills", headers=headers)
    assert len(unfiltered_resp.json()["data"]) == 3


# --- Zone-wise / category-wise aggregation ---


async def test_zone_wise_and_category_wise_report_aggregation(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)
    transport_id = await _create_transport(client, headers, "MH12AGG0001")
    zone_a = await _create_zone(client, headers, "Zone Agg A")
    zone_b = await _create_zone(client, headers, "Zone Agg B")
    category_x = await _create_category(client, headers, "Category Agg X")
    category_y = await _create_category(client, headers, "Category Agg Y")

    bills = [
        ("2026-04-01", zone_a, category_x, "100"),
        ("2026-04-05", zone_a, category_x, "200"),
        ("2026-04-10", zone_b, category_y, "50"),
    ]
    for bill_date, zone_id, category_id, amount in bills:
        resp = await client.post(
            "/api/v1/transport-bills",
            json={
                "bill_date": bill_date,
                "transport_id": transport_id,
                "zone_id": zone_id,
                "purchase_item_category_id": category_id,
                "amount": amount,
            },
            headers=headers,
        )
        assert resp.status_code == 200

    zone_report = await client.get(
        "/api/v1/transport-reports/zone-wise",
        params={"start": "2026-04-01", "end": "2026-04-30"},
        headers=headers,
    )
    assert zone_report.status_code == 200
    zone_rows = {row["zone_id"]: row for row in zone_report.json()["data"]}
    assert zone_rows[zone_a]["bill_count"] == 2
    assert float(zone_rows[zone_a]["total_amount"]) == 300
    assert zone_rows[zone_b]["bill_count"] == 1
    assert float(zone_rows[zone_b]["total_amount"]) == 50

    category_report = await client.get(
        "/api/v1/transport-reports/category-wise",
        params={"start": "2026-04-01", "end": "2026-04-30"},
        headers=headers,
    )
    assert category_report.status_code == 200
    category_rows = {row["category_id"]: row for row in category_report.json()["data"]}
    assert category_rows[category_x]["bill_count"] == 2
    assert float(category_rows[category_x]["total_amount"]) == 300
    assert category_rows[category_y]["bill_count"] == 1
    assert float(category_rows[category_y]["total_amount"]) == 50


# --- Summary aggregation ---


async def test_transport_summary_aggregation(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin_headers(client, db_session)
    own_transport_id = await _create_transport(client, headers, "MH12SUM0001", ownership="own")
    rent_transport_id = await _create_transport(client, headers, "MH12SUM0002", ownership="rent")
    zone_id = await _create_zone(client, headers, "Zone Summary")
    category_id = await _create_category(client, headers, "Category Summary")

    for transport_id, amount in ((own_transport_id, "100"), (rent_transport_id, "200")):
        resp = await client.post(
            "/api/v1/transport-bills",
            json={
                "bill_date": "2026-07-01",
                "transport_id": transport_id,
                "zone_id": zone_id,
                "purchase_item_category_id": category_id,
                "amount": amount,
            },
            headers=headers,
        )
        assert resp.status_code == 200

    summary_resp = await client.get(
        "/api/v1/transport-reports/summary",
        params={"start": "2026-07-01", "end": "2026-07-31"},
        headers=headers,
    )
    assert summary_resp.status_code == 200
    summary = summary_resp.json()["data"]
    assert summary["total_transport"] == 2
    assert summary["own_count"] == 1
    assert summary["rented_count"] == 1
    assert float(summary["total_km_running"]) == 3000  # 1500 + 1500 (two transports)
    assert float(summary["total_bill_amount"]) == 300


# --- Permission checks ---


async def test_vendor_role_forbidden_from_transport(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _non_admin_headers(client, db_session, UserRole.VENDOR, "transportvendor@kshirsagar.com")
    resp = await client.get("/api/v1/transports", headers=headers)
    assert resp.status_code == 403


async def test_driver_role_forbidden_from_transport(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _non_admin_headers(client, db_session, UserRole.DRIVER, "transportdriver@kshirsagar.com")
    resp = await client.get("/api/v1/transport-bills", headers=headers)
    assert resp.status_code == 403


# --- Empty-state responses ---


async def test_empty_states_return_empty_arrays_not_errors(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _admin_headers(client, db_session)

    zones_resp = await client.get("/api/v1/transport-zones", headers=headers)
    assert zones_resp.status_code == 200
    assert zones_resp.json()["data"] == []

    categories_resp = await client.get("/api/v1/purchase-item-categories", headers=headers)
    assert categories_resp.status_code == 200
    assert categories_resp.json()["data"] == []

    transports_resp = await client.get("/api/v1/transports", headers=headers)
    assert transports_resp.status_code == 200
    assert transports_resp.json()["data"] == []

    bills_resp = await client.get("/api/v1/transport-bills", headers=headers)
    assert bills_resp.status_code == 200
    assert bills_resp.json()["data"] == []

    summary_resp = await client.get("/api/v1/transport-reports/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()["data"]
    assert summary["total_transport"] == 0
    assert summary["own_count"] == 0
    assert summary["rented_count"] == 0
    assert float(summary["total_km_running"]) == 0
    assert float(summary["total_bill_amount"]) == 0

    zone_wise_resp = await client.get("/api/v1/transport-reports/zone-wise", headers=headers)
    assert zone_wise_resp.status_code == 200
    assert zone_wise_resp.json()["data"] == []

    category_wise_resp = await client.get("/api/v1/transport-reports/category-wise", headers=headers)
    assert category_wise_resp.status_code == 200
    assert category_wise_resp.json()["data"] == []
