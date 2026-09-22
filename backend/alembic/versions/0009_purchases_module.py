"""purchases module

Revision ID: 0009_purchases_module
Revises: 0008_delivery_zone_truck
Create Date: 2026-07-22 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0009_purchases_module"
down_revision: Union[str, None] = "0008_delivery_zone_truck"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum(name: str) -> postgresql.ENUM:
    return postgresql.ENUM(name=name, create_type=False)


LEDGER_ENTRY_TYPE_VALUES_NEW = ("purchase_invoice", "payment_out", "purchase_return", "debit_note")
LEDGER_ENTRY_TYPE_VALUES_ORIGINAL = ("invoice", "payment", "adjustment", "opening_balance")


def upgrade() -> None:
    bind = op.get_bind()

    op.add_column("vendors", sa.Column("is_supplier", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_vendors_is_supplier", "vendors", ["is_supplier"])

    postgresql.ENUM("draft", "ordered", "received", "cancelled", name="purchase_order_status").create(
        bind, checkfirst=True
    )
    postgresql.ENUM("unpaid", "partial", "paid", name="purchase_invoice_status").create(bind, checkfirst=True)
    postgresql.ENUM("draft", "completed", name="purchase_return_status").create(bind, checkfirst=True)
    postgresql.ENUM("draft", "completed", name="debit_note_status").create(bind, checkfirst=True)

    for value in LEDGER_ENTRY_TYPE_VALUES_NEW:
        op.execute(f"ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS '{value}'")

    # --- purchase_orders ---
    op.create_table(
        "purchase_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("po_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_purchase_orders_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column("order_date", sa.Date(), nullable=False),
        sa.Column("valid_till", sa.Date(), nullable=True),
        sa.Column("status", _enum("purchase_order_status"), nullable=False, server_default="draft"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("round_off", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("po_number", name="uq_purchase_orders_po_number"),
    )
    op.create_index("ix_purchase_orders_po_number", "purchase_orders", ["po_number"])
    op.create_index("ix_purchase_orders_vendor_id", "purchase_orders", ["vendor_id"])
    op.create_index("ix_purchase_orders_status", "purchase_orders", ["status"])

    op.create_table(
        "purchase_order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "purchase_order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_orders.id", ondelete="CASCADE", name="fk_purchase_order_items_purchase_order_id_purchase_orders"
            ),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL", name="fk_purchase_order_items_product_id_products"),
            nullable=True,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("tax_percent", sa.Numeric(4, 2), nullable=False, server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    )

    # --- purchase_invoices ---
    op.create_table(
        "purchase_invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_number", sa.String(30), nullable=False),
        sa.Column("vendor_invoice_number", sa.String(50), nullable=True),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_purchase_invoices_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "purchase_order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_orders.id", ondelete="SET NULL", name="fk_purchase_invoices_purchase_order_id_purchase_orders"
            ),
            nullable=True,
        ),
        sa.Column("invoice_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tds_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tcs_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("round_off", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", _enum("purchase_invoice_status"), nullable=False, server_default="unpaid"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("invoice_number", name="uq_purchase_invoices_invoice_number"),
    )
    op.create_index("ix_purchase_invoices_invoice_number", "purchase_invoices", ["invoice_number"])
    op.create_index("ix_purchase_invoices_vendor_id", "purchase_invoices", ["vendor_id"])
    op.create_index("ix_purchase_invoices_status", "purchase_invoices", ["status"])

    op.create_table(
        "purchase_invoice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "purchase_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_invoices.id",
                ondelete="CASCADE",
                name="fk_purchase_invoice_items_purchase_invoice_id_purchase_invoices",
            ),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL", name="fk_purchase_invoice_items_product_id_products"),
            nullable=True,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("tax_percent", sa.Numeric(4, 2), nullable=False, server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    )

    # --- payments_out ---
    op.create_table(
        "payments_out",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_payments_out_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "purchase_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_invoices.id", ondelete="SET NULL", name="fk_payments_out_purchase_invoice_id_purchase_invoices"
            ),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("method", _enum("payment_method"), nullable=False),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_payments_out_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("payment_number", name="uq_payments_out_payment_number"),
    )
    op.create_index("ix_payments_out_payment_number", "payments_out", ["payment_number"])
    op.create_index("ix_payments_out_vendor_id", "payments_out", ["vendor_id"])

    # --- purchase_returns ---
    op.create_table(
        "purchase_returns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("return_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_purchase_returns_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "purchase_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_invoices.id", ondelete="SET NULL", name="fk_purchase_returns_purchase_invoice_id_purchase_invoices"
            ),
            nullable=True,
        ),
        sa.Column("return_date", sa.Date(), nullable=False),
        sa.Column("due_in", sa.Date(), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", _enum("purchase_return_status"), nullable=False, server_default="completed"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("return_number", name="uq_purchase_returns_return_number"),
    )
    op.create_index("ix_purchase_returns_return_number", "purchase_returns", ["return_number"])
    op.create_index("ix_purchase_returns_vendor_id", "purchase_returns", ["vendor_id"])
    op.create_index("ix_purchase_returns_status", "purchase_returns", ["status"])

    op.create_table(
        "purchase_return_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "purchase_return_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_returns.id", ondelete="CASCADE", name="fk_purchase_return_items_purchase_return_id_purchase_returns"
            ),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL", name="fk_purchase_return_items_product_id_products"),
            nullable=True,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax_percent", sa.Numeric(4, 2), nullable=False, server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    )

    # --- debit_notes ---
    op.create_table(
        "debit_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("debit_note_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_debit_notes_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "purchase_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_invoices.id", ondelete="SET NULL", name="fk_debit_notes_purchase_invoice_id_purchase_invoices"
            ),
            nullable=True,
        ),
        sa.Column(
            "purchase_return_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_returns.id", ondelete="SET NULL", name="fk_debit_notes_purchase_return_id_purchase_returns"
            ),
            nullable=True,
        ),
        sa.Column("note_date", sa.Date(), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", _enum("debit_note_status"), nullable=False, server_default="completed"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("debit_note_number", name="uq_debit_notes_debit_note_number"),
    )
    op.create_index("ix_debit_notes_debit_note_number", "debit_notes", ["debit_note_number"])
    op.create_index("ix_debit_notes_vendor_id", "debit_notes", ["vendor_id"])
    op.create_index("ix_debit_notes_status", "debit_notes", ["status"])

    op.create_table(
        "debit_note_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "debit_note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("debit_notes.id", ondelete="CASCADE", name="fk_debit_note_items_debit_note_id_debit_notes"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL", name="fk_debit_note_items_product_id_products"),
            nullable=True,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax_percent", sa.Numeric(4, 2), nullable=False, server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("debit_note_items")
    op.drop_table("debit_notes")
    op.drop_table("purchase_return_items")
    op.drop_table("purchase_returns")
    op.drop_table("payments_out")
    op.drop_table("purchase_invoice_items")
    op.drop_table("purchase_invoices")
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")

    op.drop_index("ix_vendors_is_supplier", table_name="vendors")
    op.drop_column("vendors", "is_supplier")

    bind = op.get_bind()
    postgresql.ENUM(name="purchase_invoice_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="purchase_order_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="purchase_return_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="debit_note_status").drop(bind, checkfirst=True)

    # Postgres has no ALTER TYPE ... DROP VALUE — rebuild ledger_entry_type from
    # its original values via rename/recreate/swap.
    op.execute("ALTER TYPE ledger_entry_type RENAME TO ledger_entry_type_old")
    postgresql.ENUM(*LEDGER_ENTRY_TYPE_VALUES_ORIGINAL, name="ledger_entry_type").create(bind, checkfirst=True)
    op.execute(
        "ALTER TABLE vendor_ledger_entries ALTER COLUMN entry_type TYPE ledger_entry_type "
        "USING entry_type::text::ledger_entry_type"
    )
    op.execute("DROP TYPE ledger_entry_type_old")
