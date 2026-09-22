"""multi tenant support

Adds a `tenants` table and a `tenant_id` column to every business table, backfilled
to one bootstrap "Default Tenant" row so this applies cleanly to a fresh or an
existing dev database. Every tenant-scoped table gets Postgres row-level security
(RLS) filtering on `current_setting('app.tenant_id')`, set per-request by
`app.dependencies.auth`/`app.core.tenant_context` — this is the primary isolation
mechanism, not the application-layer queries (see docs/ARCHITECTURE.md).

`users` is a deliberate exception: it gets a `tenant_id` column but no RLS policy,
because login (`UserRepository.get_by_email`) must find a user by email before any
tenant is known. `refresh_tokens` / `password_reset_tokens` get neither — they're
looked up by token hash, also pre-tenant-context, and are tenant-agnostic by
design (always reached through a tenant-owned `user_id`).

Previously-global natural-key uniqueness (vendor codes, product SKUs, document
numbers, ...) becomes per-tenant: each `UniqueConstraint`/unique index on a
business-key column is replaced with one scoped to `(tenant_id, column)`.

`order_number_seq` / `invoice_number_seq` are dropped — orders and invoices now
number through the same tenant-scoped `business_settings`-backed counter every
other document type already used (see `app.repositories.document_numbering`).

Revision ID: 0027_multi_tenant
Revises: 0026_partner_bank_interest
Create Date: 2026-09-12 00:00:00

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0027_multi_tenant"
down_revision: Union[str, None] = "0026_partner_bank_interest"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BOOTSTRAP_TENANT_ID = str(uuid.uuid4())

# Every business table except `tenants`, `users` (special-cased below),
# `refresh_tokens`, and `password_reset_tokens`.
TENANT_SCOPED_TABLES = [
    "vendors",
    "vendor_ledger_entries",
    "vendor_bank_accounts",
    "vendor_custom_fields",
    "drivers",
    "products",
    "stock_movements",
    "orders",
    "order_items",
    "deliveries",
    "delivery_extra_items",
    "crate_transactions",
    "crate_disputes",
    "invoices",
    "invoice_items",
    "payments",
    "expenses",
    "expense_items",
    "expense_categories",
    "audit_logs",
    "business_settings",
    "permissions",
    "categories",
    "offers",
    "business_partners",
    "partner_bank_accounts",
    "partner_capital_contributions",
    "partner_profit_loss_ratios",
    "partner_drawings",
    "partner_profit_loss_allocations",
    "partner_remunerations",
    "partner_capital_interest",
    "partner_loans",
    "partner_joint_liabilities",
    "partner_responsibilities",
    "transports",
    "transport_zones",
    "transport_bills",
    "purchase_item_categories",
    "loans",
    "loan_repayment_installments",
    "loan_repayments",
    "loan_ledger_entries",
    "purchase_orders",
    "purchase_order_items",
    "purchase_invoices",
    "purchase_invoice_items",
    "payments_out",
    "payment_out_allocations",
    "purchase_returns",
    "purchase_return_items",
    "debit_notes",
    "debit_note_items",
    "quotations",
    "quotation_items",
    "sales_invoices",
    "sales_invoice_items",
    "payments_in",
    "payment_in_allocations",
    "sales_returns",
    "sales_return_items",
    "credit_notes",
    "credit_note_items",
    "delivery_challans",
    "delivery_challan_items",
    "proforma_invoices",
    "proforma_invoice_items",
    "manual_ledger_entries",
]

# (table, old_name, "constraint" | "index", column, new_uq_name)
UNIQUE_KEY_MIGRATIONS = [
    ("vendors", "uq_vendors_code", "constraint", "code", "uq_vendors_tenant_code"),
    ("products", "uq_products_sku", "constraint", "sku", "uq_products_tenant_sku"),
    ("business_settings", "uq_business_settings_key", "constraint", "key", "uq_business_settings_tenant_key"),
    ("orders", "uq_orders_order_no", "constraint", "order_no", "uq_orders_tenant_order_no"),
    ("invoices", "uq_invoices_invoice_no", "constraint", "invoice_no", "uq_invoices_tenant_invoice_no"),
    (
        "purchase_orders",
        "uq_purchase_orders_po_number",
        "constraint",
        "po_number",
        "uq_purchase_orders_tenant_po_number",
    ),
    (
        "purchase_invoices",
        "uq_purchase_invoices_invoice_number",
        "constraint",
        "invoice_number",
        "uq_purchase_invoices_tenant_invoice_number",
    ),
    (
        "payments_out",
        "uq_payments_out_payment_number",
        "constraint",
        "payment_number",
        "uq_payments_out_tenant_payment_number",
    ),
    (
        "purchase_returns",
        "uq_purchase_returns_return_number",
        "constraint",
        "return_number",
        "uq_purchase_returns_tenant_return_number",
    ),
    (
        "debit_notes",
        "uq_debit_notes_debit_note_number",
        "constraint",
        "debit_note_number",
        "uq_debit_notes_tenant_debit_note_number",
    ),
    (
        "quotations",
        "uq_quotations_quote_number",
        "constraint",
        "quote_number",
        "uq_quotations_tenant_quote_number",
    ),
    (
        "sales_invoices",
        "uq_sales_invoices_invoice_number",
        "constraint",
        "invoice_number",
        "uq_sales_invoices_tenant_invoice_number",
    ),
    (
        "payments_in",
        "uq_payments_in_payment_number",
        "constraint",
        "payment_number",
        "uq_payments_in_tenant_payment_number",
    ),
    (
        "sales_returns",
        "uq_sales_returns_return_number",
        "constraint",
        "return_number",
        "uq_sales_returns_tenant_return_number",
    ),
    (
        "credit_notes",
        "uq_credit_notes_credit_note_number",
        "constraint",
        "credit_note_number",
        "uq_credit_notes_tenant_credit_note_number",
    ),
    (
        "delivery_challans",
        "uq_delivery_challans_challan_number",
        "constraint",
        "challan_number",
        "uq_delivery_challans_tenant_challan_number",
    ),
    (
        "proforma_invoices",
        "uq_proforma_invoices_proforma_number",
        "constraint",
        "proforma_number",
        "uq_proforma_invoices_tenant_proforma_number",
    ),
    # These were added in later migrations as a unique *index* rather than a
    # table-level UniqueConstraint.
    ("categories", "ix_categories_name", "index", "name", "uq_categories_tenant_name"),
    (
        "expense_categories",
        "ix_expense_categories_name",
        "index",
        "name",
        "uq_expense_categories_tenant_name",
    ),
    (
        "expenses",
        "ix_expenses_expense_number",
        "index",
        "expense_number",
        "uq_expenses_tenant_expense_number",
    ),
    ("transport_zones", "ix_transport_zones_name", "index", "name", "uq_transport_zones_tenant_name"),
    (
        "purchase_item_categories",
        "ix_purchase_item_categories_name",
        "index",
        "name",
        "uq_purchase_item_categories_tenant_name",
    ),
    (
        "transports",
        "ix_transports_vehicle_number",
        "index",
        "vehicle_number",
        "uq_transports_tenant_vehicle_number",
    ),
    ("loans", "ix_loans_loan_number", "index", "loan_number", "uq_loans_tenant_loan_number"),
]

PERMISSIONS_OLD_UQ = "uq_permissions_feature_role"
PERMISSIONS_NEW_UQ = "uq_permissions_tenant_feature_role"


def _add_tenant_column(table: str, *, with_rls: bool) -> None:
    op.add_column(table, sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.execute(f"UPDATE {table} SET tenant_id = '{BOOTSTRAP_TENANT_ID}' WHERE tenant_id IS NULL")
    op.alter_column(table, "tenant_id", nullable=False)
    op.create_foreign_key(
        f"fk_{table}_tenant_id_tenants", table, "tenants", ["tenant_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index(f"ix_{table}_tenant_id", table, ["tenant_id"])
    if with_rls:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            "USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) "
            "WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)"
        )


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("slug", name="uq_tenants_slug"),
    )
    op.create_index("ix_tenants_slug", "tenants", ["slug"])
    op.execute(
        "INSERT INTO tenants (id, name, slug, is_active, created_at, updated_at) "
        f"VALUES ('{BOOTSTRAP_TENANT_ID}', 'Default Tenant', 'default', true, now(), now())"
    )

    _add_tenant_column("users", with_rls=False)

    for table in TENANT_SCOPED_TABLES:
        _add_tenant_column(table, with_rls=True)

    for table, old_name, kind, column, new_name in UNIQUE_KEY_MIGRATIONS:
        if kind == "constraint":
            op.drop_constraint(old_name, table, type_="unique")
        else:
            op.drop_index(old_name, table_name=table)
            op.create_index(f"ix_{table}_{column}", table, [column])
        op.create_unique_constraint(new_name, table, ["tenant_id", column])

    op.drop_constraint(PERMISSIONS_OLD_UQ, "permissions", type_="unique")
    op.create_unique_constraint(PERMISSIONS_NEW_UQ, "permissions", ["tenant_id", "feature", "role"])

    op.execute("DROP SEQUENCE IF EXISTS order_number_seq")
    op.execute("DROP SEQUENCE IF EXISTS invoice_number_seq")


def downgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1001")
    op.execute("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1041")

    op.drop_constraint(PERMISSIONS_NEW_UQ, "permissions", type_="unique")
    op.create_unique_constraint(PERMISSIONS_OLD_UQ, "permissions", ["feature", "role"])

    for table, old_name, kind, column, new_name in UNIQUE_KEY_MIGRATIONS:
        op.drop_constraint(new_name, table, type_="unique")
        if kind == "constraint":
            op.create_unique_constraint(old_name, table, [column])
        else:
            op.drop_index(f"ix_{table}_{column}", table_name=table)
            op.create_index(old_name, table, [column], unique=True)

    for table in reversed(TENANT_SCOPED_TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.drop_index(f"ix_{table}_tenant_id", table_name=table)
        op.drop_constraint(f"fk_{table}_tenant_id_tenants", table, type_="foreignkey")
        op.drop_column(table, "tenant_id")

    op.drop_index("ix_users_tenant_id", table_name="users")
    op.drop_constraint("fk_users_tenant_id_tenants", "users", type_="foreignkey")
    op.drop_column("users", "tenant_id")

    op.drop_index("ix_tenants_slug", table_name="tenants")
    op.drop_table("tenants")
