"""Seed demo data matching the Kshirsagar Dairy Distribution Suite prototype.

Run from the backend/ directory once the database is migrated:

    python -m scripts.seed_data

Idempotent: skips vendors/products/users that already exist by unique key.
"""
import asyncio
from datetime import date, timedelta
from decimal import Decimal

from app.core.security import hash_password
from app.core.tenant_context import set_tenant_context
from app.db.session import AsyncSessionLocal
from app.models.driver import Driver
from app.models.enums import UserRole
from app.models.expense import Expense
from app.models.product import Product
from app.models.user import User
from app.models.vendor import Vendor
from app.repositories.vendor_repository import VendorRepository
from scripts.create_tenant import get_or_create_tenant

EXPENSES = [
    dict(category="Fuel", amount=Decimal("4200"), payee="HP Petrol Pump", is_paid=True, note="Route 1-3 diesel refill"),
    dict(category="Salary", amount=Decimal("8800"), payee="Vijay Pawar", is_paid=True, note="Weekly driver salary"),
    dict(category="Rent", amount=Decimal("3500"), payee="Warehouse Landlord", is_paid=False, note="Cold storage rent — this week"),
    dict(category="Wastage", amount=Decimal("1200"), payee=None, is_paid=True, note="Expired stock write-off"),
    dict(category="Other", amount=Decimal("650"), payee="Packaging Supplies Co.", is_paid=False, note="Crate labels reorder"),
]

VENDORS = [
    dict(name="Sharma Dairy Point", contact_name="Rajesh Sharma", phone="9822041122", area="Kothrud", route="Route 1", gstin="27AAWCS1234K1Z2", credit_limit=Decimal("50000")),
    dict(name="Anand Milk Corner", contact_name="Anand Patil", phone="9970055340", area="Deccan", route="Route 1", gstin="27AABCA9921M1Z8", credit_limit=Decimal("40000")),
    dict(name="Gokul Provisions", contact_name="Suresh Gokhale", phone="9011022876", area="Karve Nagar", route="Route 2", gstin="27AADCG4567P1Z1", credit_limit=Decimal("25000")),
    dict(name="Sai General Store", contact_name="Nitin Sai", phone="9765078901", area="Warje", route="Route 2", gstin="27AACFS3311R1Z6", credit_limit=Decimal("20000")),
    dict(name="Krishna Dairy", contact_name="Krishna Rao", phone="9371044520", area="Bavdhan", route="Route 3", gstin="27AAECK8890L1Z3", credit_limit=Decimal("30000")),
    dict(name="Patil Kirana", contact_name="Mahesh Patil", phone="9604011209", area="Baner", route="Route 3", gstin="27AAFFP2200N1Z9", credit_limit=Decimal("15000")),
]

PRODUCTS = [
    dict(sku="MLK-TND-500", name="Toned Milk 500ml", hsn_code="0401", rate=Decimal("27"), gst_percent=Decimal("5"), current_stock=420, reorder_level=300),
    dict(sku="MLK-FC-1000", name="Full Cream Milk 1L", hsn_code="0401", rate=Decimal("66"), gst_percent=Decimal("5"), current_stock=180, reorder_level=200),
    dict(sku="MLK-COW-500", name="Cow Milk 500ml", hsn_code="0401", rate=Decimal("30"), gst_percent=Decimal("5"), current_stock=260, reorder_level=250),
    dict(sku="CRD-400", name="Curd 400g", hsn_code="0403", rate=Decimal("34"), gst_percent=Decimal("5"), current_stock=96, reorder_level=120),
    dict(sku="PNR-200", name="Paneer 200g", hsn_code="0406", rate=Decimal("92"), gst_percent=Decimal("5"), current_stock=54, reorder_level=60),
    dict(sku="BTM-1000", name="Buttermilk 1L", hsn_code="0403", rate=Decimal("24"), gst_percent=Decimal("5"), current_stock=310, reorder_level=150),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        tenant = await get_or_create_tenant(db, "Kshirsagar Dairy", "default")
        await set_tenant_context(db, tenant.id)

        vendor_repo = VendorRepository(db)
        vendors_by_name: dict[str, Vendor] = {}
        for i, v in enumerate(VENDORS):
            existing = next((x for x in await vendor_repo.search(v["name"]) if x.name == v["name"]), None)
            if existing:
                vendors_by_name[v["name"]] = existing
                continue
            vendor = Vendor(code=f"V{i + 1:02d}", vendor_since=date.today() - timedelta(days=365), **v)
            db.add(vendor)
            vendors_by_name[v["name"]] = vendor
        await db.flush()

        for p in PRODUCTS:
            result = await db.execute(Product.__table__.select().where(Product.sku == p["sku"]))
            if result.first() is None:
                db.add(Product(batch_no="B-SEED", expiry_date=date.today() + timedelta(days=14), **p))

        driver = Driver(name="Vijay Pawar", phone="9800011223", vehicle_number="MH14 GT 4521", route="Route 2")
        existing_admin = await db.execute(User.__table__.select().where(User.email == "admin@kshirsagardairy.com"))
        if existing_admin.first() is None:
            db.add(driver)
            await db.flush()

            db.add(
                User(
                    email="admin@kshirsagardairy.com",
                    password_hash=hash_password("ChangeMe123!"),
                    full_name="Ramesh Kshirsagar",
                    role=UserRole.SUPER_ADMIN,
                )
            )
            sharma = vendors_by_name["Sharma Dairy Point"]
            db.add(
                User(
                    email="vendor@kshirsagardairy.com",
                    password_hash=hash_password("ChangeMe123!"),
                    full_name="Sharma Dairy Point",
                    role=UserRole.VENDOR,
                    vendor_id=sharma.id,
                )
            )
            db.add(
                User(
                    email="driver@kshirsagardairy.com",
                    password_hash=hash_password("ChangeMe123!"),
                    full_name="Vijay Pawar",
                    role=UserRole.DRIVER,
                    driver_id=driver.id,
                )
            )

        expense_count = (await db.execute(Expense.__table__.select().limit(1))).first()
        if expense_count is None:
            today = date.today()
            for i, e in enumerate(EXPENSES):
                db.add(Expense(expense_date=today - timedelta(days=i), **e))

        await db.commit()
        print("Seed complete. Demo logins (password ChangeMe123! for all):")
        print("  admin@kshirsagardairy.com  (Admin)")
        print("  vendor@kshirsagardairy.com (Vendor — Sharma Dairy Point)")
        print("  driver@kshirsagardairy.com (Truck Owner — Vijay Pawar)")


if __name__ == "__main__":
    asyncio.run(seed())
