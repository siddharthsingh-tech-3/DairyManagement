from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.billing import router as billing_router
from app.api.v1.business_partners import router as business_partners_router
from app.api.v1.categories import router as categories_router
from app.api.v1.crates import router as crates_router
from app.api.v1.deliveries import router as deliveries_router
from app.api.v1.drivers import router as drivers_router
from app.api.v1.expense_categories import router as expense_categories_router
from app.api.v1.expenses import router as expenses_router
from app.api.v1.loans import router as loans_router
from app.api.v1.offers import router as offers_router
from app.api.v1.orders import router as orders_router
from app.api.v1.permissions import router as permissions_router
from app.api.v1.products import router as products_router
from app.api.v1.purchase_item_categories import router as purchase_item_categories_router
from app.api.v1.purchases import router as purchases_router
from app.api.v1.reports import router as reports_router
from app.api.v1.sales import router as sales_router
from app.api.v1.settings import router as settings_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.transport_bills import router as transport_bills_router
from app.api.v1.transport_reports import router as transport_reports_router
from app.api.v1.transport_zones import router as transport_zones_router
from app.api.v1.transports import router as transports_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.api.v1.vendors import router as vendors_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(tenants_router)
api_router.include_router(users_router)
api_router.include_router(permissions_router)
api_router.include_router(vendors_router)
api_router.include_router(business_partners_router)
api_router.include_router(loans_router)
api_router.include_router(products_router)
api_router.include_router(offers_router)
api_router.include_router(categories_router)
api_router.include_router(orders_router)
api_router.include_router(deliveries_router)
api_router.include_router(drivers_router)
api_router.include_router(crates_router)
api_router.include_router(billing_router)
api_router.include_router(purchases_router)
api_router.include_router(sales_router)
api_router.include_router(expenses_router)
api_router.include_router(expense_categories_router)
api_router.include_router(transport_zones_router)
api_router.include_router(purchase_item_categories_router)
api_router.include_router(transports_router)
api_router.include_router(transport_bills_router)
api_router.include_router(transport_reports_router)
api_router.include_router(reports_router)
api_router.include_router(settings_router)
api_router.include_router(uploads_router)
