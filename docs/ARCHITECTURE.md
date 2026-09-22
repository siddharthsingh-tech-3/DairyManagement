# Architecture

## Overview

Kshirsagar Dairy Distribution Suite is a B2B dairy-product distribution system:
a distributor supplies packaged milk/dairy products to retail vendors via
truck routes, tracks reusable crates, and bills vendors with GST invoices.
Three roles: **Admin/Staff** (`super_admin`), **Vendor**, **Driver** (Truck
Owner). See `Dairy-Application-Planning/` for the source prototype this app
implements.

The application is **multi-tenant**: one deployment/database serves many
independent distributor businesses ("tenants"), each with their own vendors,
drivers, products, orders, billing, users, and settings. See "Multi-tenancy"
below.

## Multi-tenancy

Shared database, `tenant_id`-per-row isolation, enforced primarily by
**Postgres row-level security (RLS)** rather than by hand-filtering every
repository query:

- `app.core.tenant_context.set_tenant_context(db, tenant_id)` is called once
  per request, in `dependencies/auth.py::get_current_user`, right after the
  JWT is resolved to a `User` row. It sets a `ContextVar` (read by the
  before-flush stamper below) and a Postgres session variable
  (`set_config('app.tenant_id', ..., false)`) that every tenant-scoped
  table's RLS policy filters `SELECT`/`UPDATE`/`DELETE` on.
- `app.db.tenant_scope` registers a SQLAlchemy `before_flush` event that
  auto-stamps `tenant_id` on any new ORM object that has that column and
  hasn't set it — so the ~65 services that construct `SomeModel(...)` don't
  need to pass `tenant_id` explicitly.
- Every tenant-scoped model uses `TenantMixin` (`app/db/base.py`), and its
  table gets `ENABLE`/`FORCE ROW LEVEL SECURITY` + a policy in the
  `0027_multi_tenant` migration. **`users` is the one deliberate exception** —
  login must find a user by email before any tenant is known, so it's
  isolated with an explicit `tenant_id` filter in `UserRepository`/
  `UserService` instead of RLS. `refresh_tokens`/`password_reset_tokens`
  carry no `tenant_id` at all (looked up by token hash, pre-tenant-context,
  and always reached through a tenant-owned `user_id`).
- Tenants are provisioned manually via `backend/scripts/create_tenant.py`
  (mirrors `seed_data.py`) — there's no self-serve signup or platform-admin
  UI yet.
- Document numbering (order/invoice numbers, PO numbers, ...) is per-tenant
  for free, because it already went through a `business_settings`-backed
  counter (`app.repositories.document_numbering.DocumentNumberingMixin`) that
  became tenant-scoped along with every other table.

## Backend (`backend/app`)

Layered, dependency-injected FastAPI service:

```
api/v1/        Routers — parse/validate request, call a service, wrap the response. No business logic here.
services/      Business logic & orchestration (one per module). Owns transactions (commits).
repositories/  Pure data access (SQLAlchemy queries). No business rules.
models/        SQLAlchemy 2.0 declarative models (one module per entity), enums.py for shared enums.
schemas/       Pydantic v2 request/response DTOs.
dependencies/  get_db, get_current_user, require_permission()/require_role() — FastAPI Depends() factories.
core/          config (pydantic-settings), security (JWT/argon2), exceptions, response envelope, logging.
middleware/    Request logging.
db/            Async engine/session, declarative Base + mixins.
tests/         Pytest + httpx.AsyncClient, one module per feature.
```

Every list/detail endpoint returns `{success, message, data}` (see
`core/responses.py`); errors go through the handlers in
`core/exception_handlers.py` so the envelope shape is consistent even on
4xx/5xx. Domain errors are raised as `AppError` subclasses
(`core/exceptions.py`) — `NotFoundError`, `ConflictError`, `BusinessRuleError`,
`PermissionDeniedError`, etc. — and mapped to the right HTTP status centrally.

### Auth & RBAC

JWT access tokens (short-lived) + rotating refresh tokens (hashed at rest,
revocable). `super_admin` always has full access. `vendor`/`driver` access is
gated per-feature by an **admin-editable permission matrix**
(`permissions` table: feature × role → `full`/`view`/`none`), seeded with
defaults in `services/permission_service.py::DEFAULT_MATRIX` and enforced by
the `require_permission(feature, min_level)` dependency. This replaces the
prototype's hardcoded `ACCESS` map with something an admin can actually change
at runtime from the Users & Access screen.

A vendor confirming their own delivery receipt or requesting extra items acts
within their own order's scope (ownership-checked in the service layer), not
the general "delivery" dispatch-board feature — see the comment in
`api/v1/deliveries.py`.

### Business rules (kept out of routers, live in services)

- **Order cutoff** (`services/order_service.py::_validate_timing`): same-day
  orders blocked after `SAME_DAY_ORDER_CUTOFF_HOUR` (default 06:00); next-day
  orders close at `NEXT_DAY_ORDER_CUTOFF_HOUR` (default 21:00); recurring
  orders skip date cutoffs.
- **Editable window**: scheduled orders are editable until
  `SCHEDULED_ORDER_EDIT_CUTOFF_DAYS` (default 1) day before delivery
  (`is_order_editable`).
- **Credit limit**: creating an order for a vendor whose
  outstanding+new-total would exceed their credit limit sets
  `needs_approval=True` on the order rather than blocking it (matches the
  prototype: over-limit vendors surface a banner, they aren't hard-blocked).
- **Crate ledger**: `crate_transactions` is append-only — Issue/Return/Damage/
  Adjustment rows. Balance is derived, never mutated in place
  (`services/crate_service.py::get_summary`). Reconciliation posts a new row.
- **GST invoicing**: `services/billing_service.py::generate_invoice`
  aggregates delivered/confirmed orders in a vendor's billing period into one
  invoice, computing CGST/SGST server-side from `DEFAULT_CGST_PERCENT`/
  `DEFAULT_SGST_PERCENT` — never trusts a client-supplied total.

## Frontend (`frontend/src`)

```
api/         axios instance with a 401 → refresh-token → retry interceptor, one module per resource
components/  Reusable UI: DataTable (search/sort/paginate), StatCard, StatusBadge, ConfirmDialog, GlobalToast, ErrorBoundary
features/    Module-specific forms/dialogs (ScheduleOrderModal, ReconcileModal, InvoiceDetailDialog, ...)
pages/       One routed screen per module, role-aware where the prototype was (Dashboard, Orders, Delivery)
layouts/     AppLayout (topbar+sidebar, nav gated by the live permission matrix), AuthLayout
routes/      ProtectedRoute (auth guard), PermissionRoute (feature guard)
store/       Zustand: authStore (persisted tokens+user), uiStore (toast)
hooks/       useAuth (login/logout/me), usePermissions (matrix + can() helper)
theme/       MUI theme matching the prototype's palette/typography (Manrope + IBM Plex Mono)
types/       Hand-written DTOs mirroring the backend Pydantic schemas
```

State: **TanStack Query** owns all server state (caching, invalidation on
mutation success); **Zustand** owns only client/session state (auth tokens,
toast). There is no client-side role switcher in production — the
authenticated JWT determines role, and nav/actions are gated by the same
permission matrix the backend enforces (`hooks/usePermissions.ts` mirrors
`dependencies/permissions.py`'s ranking so the UI doesn't show actions the API
would reject).

## Cross-cutting

- **Response envelope**: every endpoint returns `{success, message, data}` —
  see `core/responses.py` (backend) and `types/api.ts` (frontend).
- **Docker**: `docker-compose.yml` runs the full stack (Postgres, Redis,
  backend, frontend behind nginx, a reverse-proxy nginx). `docker-compose.dev.yml`
  overrides backend/frontend for hot-reload local development.
- **CI**: `.github/workflows/ci.yml` lints/type-checks/tests both apps and
  builds both Docker images on every push/PR.
