# Database

PostgreSQL 16, SQLAlchemy 2.0 (async, `asyncpg` at runtime; `psycopg2` for
Alembic migrations — see `backend/app/core/config.py`'s `DATABASE_URL` vs
`DATABASE_URL_SYNC`). Migrations live in `backend/alembic/versions/`, applied
automatically by the backend container's entrypoint (`alembic upgrade head`)
before it starts serving.

## Multi-tenancy

`tenants` is the root of a shared-database, row-level-security multi-tenant
model: almost every table below carries a `tenant_id` FK to it, enforced by a
Postgres RLS policy (`ENABLE`/`FORCE ROW LEVEL SECURITY` + a policy filtering
on `current_setting('app.tenant_id')`), not by application-layer filtering —
see "Multi-tenancy" in `ARCHITECTURE.md`. Natural-key uniqueness that used to
be global (`vendors.code`, `products.sku`, every document number, ...) is now
scoped `(tenant_id, key)` instead. `users` has a `tenant_id` column but no RLS
policy (see above); `refresh_tokens`/`password_reset_tokens` have neither.

## Entity relationship overview

```
tenants ──< (almost every table below, via tenant_id)

users ──┬─< refresh_tokens
        ├─< password_reset_tokens
        ├──> vendors (nullable, for role=vendor)
        └──> drivers (nullable, for role=driver)

permissions            (feature, role) → level — admin-editable RBAC matrix

vendors ──┬─< vendor_ledger_entries      (debit/credit rows; outstanding_balance is a maintained cache)
          ├─< orders
          ├─< crate_transactions
          ├─< crate_disputes
          ├─< invoices
          └─< payments

drivers ──< deliveries

products ──┬─< order_items
           ├─< stock_movements
           ├─< delivery_extra_items
           └─< invoice_items

orders ──┬─< order_items
         ├── deliveries              (1:1 — one delivery record per order)
         └──> invoices               (nullable invoice_id, set once billed)

deliveries ──┬─< delivery_extra_items
             ├─< crate_transactions   (related_delivery_id, nullable)
             └─< crate_disputes       (related_delivery_id, nullable)

invoices ──┬─< invoice_items
           └─< payments

expenses, audit_logs, business_settings   — standalone
```

## Table notes

| Table | Purpose | Notable constraints |
|---|---|---|
| `users` | Auth identity; `role` enum ties to at most one of `vendor_id`/`driver_id`. | unique `email`, unique `phone` |
| `refresh_tokens` / `password_reset_tokens` | Hashed tokens only — raw tokens never persisted. | unique `token_hash` |
| `permissions` | `(feature, role)` → `full`/`view`/`none`. Admin is implicit-full, not stored. | unique `(feature, role)` |
| `vendors` | Party profile + `credit_limit`/`outstanding_balance` (cache kept in sync by `VendorService.post_ledger_entry`, source of truth is `vendor_ledger_entries`). | unique `code` |
| `vendor_ledger_entries` | Append-only debit/credit rows (invoice, payment, adjustment, opening balance). | FK vendor cascade |
| `products` | SKU/HSN/rate/GST/batch/expiry/reorder level. | unique `sku` |
| `stock_movements` | Signed `quantity_delta` audit trail (purchase/consumption/adjustment/sale_dispatch). | FK product cascade |
| `orders` | `order_no` from a Postgres sequence (`order_number_seq`, starts 1001). Status lifecycle: draft→scheduled→locked→dispatched→delivered→confirmed / cancelled. | unique `order_no` |
| `order_items` | Rate/GST **snapshotted** at order time (price changes later don't retroactively change past orders). | FK order cascade |
| `deliveries` | One per order (`unique(order_id)`); lifecycle pending→dispatched→delivered→confirmed. | unique `order_id` |
| `delivery_extra_items` | Ad-hoc items added at/near delivery, tagged `requested_by` (vendor or driver). | FK delivery cascade |
| `crate_transactions` | Append-only Issue/Return/Damage/Adjustment ledger — balance is derived, corrections are new rows, nothing is ever mutated or deleted. | |
| `crate_disputes` | Driver-reported vs vendor-confirmed quantity mismatch; resolved by admin. | |
| `invoices` / `invoice_items` | GST tax invoice: `subtotal`, `cgst`, `sgst`, `total`, `amount_paid`. `invoice_no` from `invoice_number_seq` (starts 1041). | unique `invoice_no` |
| `payments` | UPI/COD/Pay-later/Cash/Bank, optionally linked to an invoice and/or order. | |
| `expenses` | Fuel/Salary/Rent/Wastage/Other — feeds the Profit & Loss report. | |
| `audit_logs` | Immutable activity feed shown on Reports & Audit. | |
| `business_settings` | Admin-editable key/value config (company info, UPI id, ...). | unique `key` |

## Migrations

- `0001_initial_schema` — all core tables + Postgres ENUM types.
- `0002_order_number_sequence` — `order_number_seq`.
- `0003_orders_invoice_link` — `orders.invoice_id` FK (added after `invoices`
  exists to avoid a forward reference in the initial migration) +
  `invoice_number_seq`.
- ...
- `0027_multi_tenant` — adds `tenants` + `tenant_id` on every business table,
  RLS policies, per-tenant unique constraints, and drops `order_number_seq` /
  `invoice_number_seq` (orders/invoices now number through the same
  tenant-scoped `business_settings` counter every other document type uses).

To generate a new migration after changing a model:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

## Seed data

`backend/scripts/seed_data.py` (`python -m scripts.seed_data` from `backend/`)
loads the same demo vendors/products/driver/users used in the prototype, plus
three login accounts (password `ChangeMe123!`): `admin@kshirsagardairy.com`,
`vendor@kshirsagardairy.com`, `driver@kshirsagardairy.com`.
