"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-08 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum(name: str, *values: str) -> postgresql.ENUM:
    return postgresql.ENUM(*values, name=name, create_type=False)


ENUM_DEFS: dict[str, tuple[str, ...]] = {
    "user_role": ("super_admin", "vendor", "driver"),
    "permission_level": ("full", "view", "none"),
    "order_type": ("normal", "scheduled", "recurring"),
    "order_status": (
        "draft",
        "scheduled",
        "locked",
        "dispatched",
        "delivered",
        "confirmed",
        "cancelled",
    ),
    "payment_method": ("upi", "cod", "pay_later", "cash", "bank"),
    "payment_status": ("pending", "completed", "failed"),
    "delivery_status": ("pending", "dispatched", "delivered", "confirmed"),
    "extra_item_requested_by": ("vendor", "driver"),
    "crate_txn_type": ("issue", "return", "damage", "adjustment"),
    "dispute_status": ("open", "resolved"),
    "stock_movement_type": ("purchase", "consumption", "adjustment", "sale_dispatch"),
    "invoice_status": ("due", "partial", "paid", "overdue"),
    "ledger_entry_type": ("invoice", "payment", "adjustment", "opening_balance"),
    "expense_category": ("fuel", "salary", "rent", "wastage", "other"),
}


def upgrade() -> None:
    bind = op.get_bind()
    for name, values in ENUM_DEFS.items():
        postgresql.ENUM(*values, name=name).create(bind, checkfirst=True)

    # --- drivers ---
    op.create_table(
        "drivers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("vehicle_number", sa.String(20), nullable=False),
        sa.Column("route", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # --- vendors ---
    op.create_table(
        "vendors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("contact_name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("area", sa.String(100), nullable=False),
        sa.Column("route", sa.String(50), nullable=False),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("credit_limit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("outstanding_balance", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("crates_with_vendor", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vendor_since", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("code", name="uq_vendors_code"),
    )
    op.create_index("ix_vendors_code", "vendors", ["code"])

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("role", _enum("user_role"), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="SET NULL", name="fk_users_vendor_id_vendors"),
            nullable=True,
        ),
        sa.Column(
            "driver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("drivers.id", ondelete="SET NULL", name="fk_users_driver_id_drivers"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_phone", "users", ["phone"])
    op.create_index("ix_users_role", "users", ["role"])

    # --- refresh_tokens ---
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_refresh_tokens_user_id_users"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
    )
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])

    # --- password_reset_tokens ---
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE", name="fk_password_reset_tokens_user_id_users"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_password_reset_tokens_token_hash"),
    )
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"])

    # --- permissions ---
    op.create_table(
        "permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("feature", sa.String(50), nullable=False),
        sa.Column("role", _enum("user_role"), nullable=False),
        sa.Column("level", _enum("permission_level"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("feature", "role", name="uq_permissions_feature_role"),
    )
    op.create_index("ix_permissions_feature", "permissions", ["feature"])

    # --- vendor_ledger_entries ---
    op.create_table(
        "vendor_ledger_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="CASCADE", name="fk_vendor_ledger_entries_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column("entry_type", _enum("ledger_entry_type"), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("debit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("credit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("reference_type", sa.String(30), nullable=True),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_vendor_ledger_entries_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- products ---
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sku", sa.String(30), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("gst_percent", sa.Numeric(4, 2), nullable=False, server_default="5.0"),
        sa.Column("unit", sa.String(20), nullable=False, server_default="pkt"),
        sa.Column("current_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reorder_level", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("batch_no", sa.String(30), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("sku", name="uq_products_sku"),
    )
    op.create_index("ix_products_sku", "products", ["sku"])

    # --- stock_movements ---
    op.create_table(
        "stock_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE", name="fk_stock_movements_product_id_products"),
            nullable=False,
        ),
        sa.Column("movement_type", _enum("stock_movement_type"), nullable=False),
        sa.Column("quantity_delta", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        sa.Column("reference_type", sa.String(30), nullable=True),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_stock_movements_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- orders ---
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_no", sa.String(20), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_orders_vendor_id_vendors"),
            nullable=True,
        ),
        sa.Column("walkin_customer_name", sa.String(150), nullable=True),
        sa.Column("is_walkin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("order_type", _enum("order_type"), nullable=False),
        sa.Column("recurrence_frequency", sa.String(30), nullable=True),
        sa.Column("delivery_date", sa.Date(), nullable=True),
        sa.Column("status", _enum("order_status"), nullable=False, server_default="draft"),
        sa.Column("payment_method", _enum("payment_method"), nullable=True),
        sa.Column("total_crates", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("needs_approval", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_orders_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("order_no", name="uq_orders_order_no"),
    )
    op.create_index("ix_orders_order_no", "orders", ["order_no"])
    op.create_index("ix_orders_vendor_id", "orders", ["vendor_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    # --- order_items ---
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="CASCADE", name="fk_order_items_order_id_orders"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="RESTRICT", name="fk_order_items_product_id_products"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("rate_snapshot", sa.Numeric(10, 2), nullable=False),
        sa.Column("gst_percent_snapshot", sa.Numeric(4, 2), nullable=False),
        sa.Column("crates_qty", sa.Integer(), nullable=False, server_default="0"),
    )

    # --- deliveries ---
    op.create_table(
        "deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="CASCADE", name="fk_deliveries_order_id_orders"),
            nullable=False,
        ),
        sa.Column(
            "driver_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("drivers.id", ondelete="SET NULL", name="fk_deliveries_driver_id_drivers"),
            nullable=True,
        ),
        sa.Column("route", sa.String(50), nullable=True),
        sa.Column("stop_no", sa.Integer(), nullable=True),
        sa.Column("status", _enum("delivery_status"), nullable=False, server_default="pending"),
        sa.Column("delivered_quantity", sa.Integer(), nullable=True),
        sa.Column("crates_out", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("crates_in", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("order_id", name="uq_deliveries_order_id"),
    )
    op.create_index("ix_deliveries_driver_id", "deliveries", ["driver_id"])
    op.create_index("ix_deliveries_status", "deliveries", ["status"])

    # --- delivery_extra_items ---
    op.create_table(
        "delivery_extra_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "delivery_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "deliveries.id", ondelete="CASCADE", name="fk_delivery_extra_items_delivery_id_deliveries"
            ),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "products.id", ondelete="RESTRICT", name="fk_delivery_extra_items_product_id_products"
            ),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("requested_by", _enum("extra_item_requested_by"), nullable=False),
    )

    # --- crate_transactions ---
    op.create_table(
        "crate_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="CASCADE", name="fk_crate_transactions_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column("txn_type", _enum("crate_txn_type"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        sa.Column(
            "related_delivery_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "deliveries.id", ondelete="SET NULL", name="fk_crate_transactions_related_delivery_id_deliveries"
            ),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_crate_transactions_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_crate_transactions_vendor_id", "crate_transactions", ["vendor_id"])

    # --- crate_disputes ---
    op.create_table(
        "crate_disputes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="CASCADE", name="fk_crate_disputes_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "related_delivery_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "deliveries.id", ondelete="SET NULL", name="fk_crate_disputes_related_delivery_id_deliveries"
            ),
            nullable=True,
        ),
        sa.Column("driver_reported_qty", sa.Integer(), nullable=False),
        sa.Column("vendor_confirmed_qty", sa.Integer(), nullable=False),
        sa.Column("status", _enum("dispute_status"), nullable=False, server_default="open"),
        sa.Column("resolution_note", sa.String(255), nullable=True),
        sa.Column(
            "resolved_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_crate_disputes_resolved_by_users"),
            nullable=True,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_crate_disputes_vendor_id", "crate_disputes", ["vendor_id"])
    op.create_index("ix_crate_disputes_status", "crate_disputes", ["status"])

    # --- invoices ---
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_no", sa.String(20), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_invoices_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column("period_month", sa.Date(), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("cgst", sa.Numeric(12, 2), nullable=False),
        sa.Column("sgst", sa.Numeric(12, 2), nullable=False),
        sa.Column("total", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", _enum("invoice_status"), nullable=False, server_default="due"),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("invoice_no", name="uq_invoices_invoice_no"),
    )
    op.create_index("ix_invoices_invoice_no", "invoices", ["invoice_no"])
    op.create_index("ix_invoices_vendor_id", "invoices", ["vendor_id"])
    op.create_index("ix_invoices_status", "invoices", ["status"])

    # --- invoice_items ---
    op.create_table(
        "invoice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("invoices.id", ondelete="CASCADE", name="fk_invoice_items_invoice_id_invoices"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL", name="fk_invoice_items_product_id_products"),
            nullable=True,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    )

    # --- payments ---
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_payments_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("invoices.id", ondelete="SET NULL", name="fk_payments_invoice_id_invoices"),
            nullable=True,
        ),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="SET NULL", name="fk_payments_order_id_orders"),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("method", _enum("payment_method"), nullable=False),
        sa.Column("status", _enum("payment_status"), nullable=False, server_default="completed"),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column(
            "recorded_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_payments_recorded_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payments_vendor_id", "payments", ["vendor_id"])

    # --- expenses ---
    op.create_table(
        "expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category", _enum("expense_category"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        sa.Column("attachment_url", sa.String(500), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_expenses_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_expenses_category", "expenses", ["category"])
    op.create_index("ix_expenses_expense_date", "expenses", ["expense_date"])

    # --- audit_logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_audit_logs_user_id_users"),
            nullable=True,
        ),
        sa.Column("actor_name", sa.String(150), nullable=False),
        sa.Column("action", sa.String(500), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # --- business_settings ---
    op.create_table(
        "business_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("value", sa.String(2000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("key", name="uq_business_settings_key"),
    )
    op.create_index("ix_business_settings_key", "business_settings", ["key"])


def downgrade() -> None:
    op.drop_table("business_settings")
    op.drop_table("audit_logs")
    op.drop_table("expenses")
    op.drop_table("payments")
    op.drop_table("invoice_items")
    op.drop_table("invoices")
    op.drop_table("crate_disputes")
    op.drop_table("crate_transactions")
    op.drop_table("delivery_extra_items")
    op.drop_table("deliveries")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("stock_movements")
    op.drop_table("products")
    op.drop_table("vendor_ledger_entries")
    op.drop_table("permissions")
    op.drop_table("password_reset_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
    op.drop_table("vendors")
    op.drop_table("drivers")

    bind = op.get_bind()
    for name, values in ENUM_DEFS.items():
        postgresql.ENUM(*values, name=name).drop(bind, checkfirst=True)
