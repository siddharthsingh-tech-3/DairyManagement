"""sales module

Revision ID: 0013_sales_module
Revises: 0012_payment_out_allocations
Create Date: 2026-07-24 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0013_sales_module"
down_revision: Union[str, None] = "0012_payment_out_allocations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _enum(name: str) -> postgresql.ENUM:
    return postgresql.ENUM(name=name, create_type=False)


LEDGER_ENTRY_TYPE_VALUES_NEW = ("sales_invoice", "payment_in", "sales_return", "credit_note")
LEDGER_ENTRY_TYPE_VALUES_ORIGINAL = (
    "invoice",
    "payment",
    "adjustment",
    "opening_balance",
    "purchase_invoice",
    "payment_out",
    "purchase_return",
    "debit_note",
)


def _priced_item_columns(fk_table: str, fk_name: str) -> list[sa.Column]:
    return [
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            f"{fk_table}_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{fk_table}s.id", ondelete="CASCADE", name=fk_name),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL", name=f"{fk_name}_product_id"),
            nullable=True,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount_percent", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("tax_percent", sa.Numeric(4, 2), nullable=False, server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    ]


def _adjustment_item_columns(fk_table: str, fk_name: str) -> list[sa.Column]:
    return [
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            f"{fk_table}_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(f"{fk_table}s.id", ondelete="CASCADE", name=fk_name),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="SET NULL", name=f"{fk_name}_product_id"),
            nullable=True,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("hsn_code", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax_percent", sa.Numeric(4, 2), nullable=False, server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    ]


def upgrade() -> None:
    bind = op.get_bind()

    postgresql.ENUM("draft", "sent", "accepted", "declined", "expired", name="quotation_status").create(
        bind, checkfirst=True
    )
    postgresql.ENUM("unpaid", "partial", "paid", "cancelled", name="sales_invoice_status").create(
        bind, checkfirst=True
    )
    postgresql.ENUM("draft", "completed", name="sales_return_status").create(bind, checkfirst=True)
    postgresql.ENUM("draft", "completed", name="credit_note_status").create(bind, checkfirst=True)
    postgresql.ENUM(
        "draft", "dispatched", "delivered", "invoiced", "cancelled", name="delivery_challan_status"
    ).create(bind, checkfirst=True)
    postgresql.ENUM("draft", "sent", "accepted", "expired", name="proforma_invoice_status").create(
        bind, checkfirst=True
    )

    for value in LEDGER_ENTRY_TYPE_VALUES_NEW:
        op.execute(f"ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS '{value}'")

    # --- quotations ---
    op.create_table(
        "quotations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("quote_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_quotations_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column("quote_date", sa.Date(), nullable=False),
        sa.Column("valid_till", sa.Date(), nullable=True),
        sa.Column("status", _enum("quotation_status"), nullable=False, server_default="draft"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("round_off", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("quote_number", name="uq_quotations_quote_number"),
    )
    op.create_index("ix_quotations_quote_number", "quotations", ["quote_number"])
    op.create_index("ix_quotations_vendor_id", "quotations", ["vendor_id"])
    op.create_index("ix_quotations_status", "quotations", ["status"])

    op.create_table("quotation_items", *_priced_item_columns("quotation", "fk_quotation_items_quotation_id"))

    # --- sales_invoices ---
    op.create_table(
        "sales_invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_sales_invoices_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "quotation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("quotations.id", ondelete="SET NULL", name="fk_sales_invoices_quotation_id_quotations"),
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
        sa.Column("additional_charges", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", _enum("sales_invoice_status"), nullable=False, server_default="unpaid"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("payment_terms", sa.String(100), nullable=True),
        sa.Column("terms_and_conditions", sa.String(1000), nullable=True),
        sa.Column("authorized_signatory_name", sa.String(150), nullable=True),
        sa.Column("authorized_signatory_signature_url", sa.String(300), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("invoice_number", name="uq_sales_invoices_invoice_number"),
    )
    op.create_index("ix_sales_invoices_invoice_number", "sales_invoices", ["invoice_number"])
    op.create_index("ix_sales_invoices_vendor_id", "sales_invoices", ["vendor_id"])
    op.create_index("ix_sales_invoices_status", "sales_invoices", ["status"])

    op.create_table(
        "sales_invoice_items", *_priced_item_columns("sales_invoice", "fk_sales_invoice_items_sales_invoice_id")
    )

    # --- payments_in ---
    op.create_table(
        "payments_in",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_payments_in_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "sales_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "sales_invoices.id", ondelete="SET NULL", name="fk_payments_in_sales_invoice_id_sales_invoices"
            ),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("method", _enum("payment_method"), nullable=False),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_payments_in_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("payment_number", name="uq_payments_in_payment_number"),
    )
    op.create_index("ix_payments_in_payment_number", "payments_in", ["payment_number"])
    op.create_index("ix_payments_in_vendor_id", "payments_in", ["vendor_id"])

    op.create_table(
        "payment_in_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "payment_in_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("payments_in.id", ondelete="CASCADE", name="fk_payment_in_allocations_payment_in_id"),
            nullable=False,
        ),
        sa.Column(
            "sales_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "sales_invoices.id", ondelete="RESTRICT", name="fk_payment_in_allocations_sales_invoice_id"
            ),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.create_index("ix_payment_in_allocations_payment_in_id", "payment_in_allocations", ["payment_in_id"])
    op.create_index("ix_payment_in_allocations_sales_invoice_id", "payment_in_allocations", ["sales_invoice_id"])

    # --- sales_returns ---
    op.create_table(
        "sales_returns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("return_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_sales_returns_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "sales_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "sales_invoices.id", ondelete="SET NULL", name="fk_sales_returns_sales_invoice_id_sales_invoices"
            ),
            nullable=True,
        ),
        sa.Column("return_date", sa.Date(), nullable=False),
        sa.Column("due_in", sa.Date(), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", _enum("sales_return_status"), nullable=False, server_default="completed"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("return_number", name="uq_sales_returns_return_number"),
    )
    op.create_index("ix_sales_returns_return_number", "sales_returns", ["return_number"])
    op.create_index("ix_sales_returns_vendor_id", "sales_returns", ["vendor_id"])
    op.create_index("ix_sales_returns_status", "sales_returns", ["status"])

    op.create_table(
        "sales_return_items", *_adjustment_item_columns("sales_return", "fk_sales_return_items_sales_return_id")
    )

    # --- credit_notes ---
    op.create_table(
        "credit_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("credit_note_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_credit_notes_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "sales_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "sales_invoices.id", ondelete="SET NULL", name="fk_credit_notes_sales_invoice_id_sales_invoices"
            ),
            nullable=True,
        ),
        sa.Column(
            "sales_return_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "sales_returns.id", ondelete="SET NULL", name="fk_credit_notes_sales_return_id_sales_returns"
            ),
            nullable=True,
        ),
        sa.Column("note_date", sa.Date(), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", _enum("credit_note_status"), nullable=False, server_default="completed"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("credit_note_number", name="uq_credit_notes_credit_note_number"),
    )
    op.create_index("ix_credit_notes_credit_note_number", "credit_notes", ["credit_note_number"])
    op.create_index("ix_credit_notes_vendor_id", "credit_notes", ["vendor_id"])
    op.create_index("ix_credit_notes_status", "credit_notes", ["status"])

    op.create_table(
        "credit_note_items", *_adjustment_item_columns("credit_note", "fk_credit_note_items_credit_note_id")
    )

    # --- delivery_challans ---
    op.create_table(
        "delivery_challans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("challan_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_delivery_challans_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "quotation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "quotations.id", ondelete="SET NULL", name="fk_delivery_challans_quotation_id_quotations"
            ),
            nullable=True,
        ),
        sa.Column(
            "sales_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "sales_invoices.id", ondelete="SET NULL", name="fk_delivery_challans_sales_invoice_id_sales_invoices"
            ),
            nullable=True,
        ),
        sa.Column("challan_date", sa.Date(), nullable=False),
        sa.Column("status", _enum("delivery_challan_status"), nullable=False, server_default="draft"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("challan_number", name="uq_delivery_challans_challan_number"),
    )
    op.create_index("ix_delivery_challans_challan_number", "delivery_challans", ["challan_number"])
    op.create_index("ix_delivery_challans_vendor_id", "delivery_challans", ["vendor_id"])
    op.create_index("ix_delivery_challans_status", "delivery_challans", ["status"])

    op.create_table(
        "delivery_challan_items",
        *_priced_item_columns("delivery_challan", "fk_delivery_challan_items_delivery_challan_id"),
    )

    # --- proforma_invoices ---
    op.create_table(
        "proforma_invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("proforma_number", sa.String(30), nullable=False),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="RESTRICT", name="fk_proforma_invoices_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column(
            "quotation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "quotations.id", ondelete="SET NULL", name="fk_proforma_invoices_quotation_id_quotations"
            ),
            nullable=True,
        ),
        sa.Column("proforma_date", sa.Date(), nullable=False),
        sa.Column("valid_till", sa.Date(), nullable=True),
        sa.Column("status", _enum("proforma_invoice_status"), nullable=False, server_default="draft"),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("round_off", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_by", sa.String(150), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("proforma_number", name="uq_proforma_invoices_proforma_number"),
    )
    op.create_index("ix_proforma_invoices_proforma_number", "proforma_invoices", ["proforma_number"])
    op.create_index("ix_proforma_invoices_vendor_id", "proforma_invoices", ["vendor_id"])
    op.create_index("ix_proforma_invoices_status", "proforma_invoices", ["status"])

    op.create_table(
        "proforma_invoice_items",
        *_priced_item_columns("proforma_invoice", "fk_proforma_invoice_items_proforma_invoice_id"),
    )


def downgrade() -> None:
    op.drop_table("proforma_invoice_items")
    op.drop_table("proforma_invoices")
    op.drop_table("delivery_challan_items")
    op.drop_table("delivery_challans")
    op.drop_table("credit_note_items")
    op.drop_table("credit_notes")
    op.drop_table("sales_return_items")
    op.drop_table("sales_returns")
    op.drop_table("payment_in_allocations")
    op.drop_table("payments_in")
    op.drop_table("sales_invoice_items")
    op.drop_table("sales_invoices")
    op.drop_table("quotation_items")
    op.drop_table("quotations")

    bind = op.get_bind()
    postgresql.ENUM(name="proforma_invoice_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="delivery_challan_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="credit_note_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="sales_return_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="sales_invoice_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="quotation_status").drop(bind, checkfirst=True)

    # Postgres has no ALTER TYPE ... DROP VALUE — rebuild ledger_entry_type from
    # its pre-sales-module values via rename/recreate/swap.
    op.execute("ALTER TYPE ledger_entry_type RENAME TO ledger_entry_type_old")
    postgresql.ENUM(*LEDGER_ENTRY_TYPE_VALUES_ORIGINAL, name="ledger_entry_type").create(bind, checkfirst=True)
    op.execute(
        "ALTER TABLE vendor_ledger_entries ALTER COLUMN entry_type TYPE ledger_entry_type "
        "USING entry_type::text::ledger_entry_type"
    )
    op.execute("DROP TYPE ledger_entry_type_old")
