"""purchase order & debit note bill fields

Revision ID: 0015_order_debit_note_fields
Revises: 0014_purchase_return_bill_fields
Create Date: 2026-08-01 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015_order_debit_note_fields"
down_revision: Union[str, None] = "0014_purchase_return_bill_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- purchase_orders ---
    op.add_column(
        "purchase_orders",
        sa.Column("additional_charges", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "purchase_orders",
        sa.Column("tds_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "purchase_orders",
        sa.Column("tcs_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "purchase_orders",
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column("purchase_orders", sa.Column("payment_terms", sa.String(100), nullable=True))
    op.add_column("purchase_orders", sa.Column("terms_and_conditions", sa.String(1000), nullable=True))
    op.add_column("purchase_orders", sa.Column("authorized_signatory_name", sa.String(150), nullable=True))
    op.add_column(
        "purchase_orders", sa.Column("authorized_signatory_signature_url", sa.String(300), nullable=True)
    )
    op.alter_column("purchase_orders", "additional_charges", server_default=None)
    op.alter_column("purchase_orders", "tds_amount", server_default=None)
    op.alter_column("purchase_orders", "tcs_amount", server_default=None)
    op.alter_column("purchase_orders", "amount_paid", server_default=None)

    # --- debit_notes ---
    op.add_column(
        "debit_notes",
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "debit_notes",
        sa.Column("additional_charges", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "debit_notes",
        sa.Column("tds_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "debit_notes",
        sa.Column("tcs_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "debit_notes",
        sa.Column("round_off", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "debit_notes",
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column("debit_notes", sa.Column("payment_terms", sa.String(100), nullable=True))
    op.add_column("debit_notes", sa.Column("terms_and_conditions", sa.String(1000), nullable=True))
    op.add_column("debit_notes", sa.Column("authorized_signatory_name", sa.String(150), nullable=True))
    op.add_column(
        "debit_notes", sa.Column("authorized_signatory_signature_url", sa.String(300), nullable=True)
    )
    op.alter_column("debit_notes", "discount_amount", server_default=None)
    op.alter_column("debit_notes", "additional_charges", server_default=None)
    op.alter_column("debit_notes", "tds_amount", server_default=None)
    op.alter_column("debit_notes", "tcs_amount", server_default=None)
    op.alter_column("debit_notes", "round_off", server_default=None)
    op.alter_column("debit_notes", "amount_paid", server_default=None)


def downgrade() -> None:
    op.drop_column("debit_notes", "authorized_signatory_signature_url")
    op.drop_column("debit_notes", "authorized_signatory_name")
    op.drop_column("debit_notes", "terms_and_conditions")
    op.drop_column("debit_notes", "payment_terms")
    op.drop_column("debit_notes", "amount_paid")
    op.drop_column("debit_notes", "round_off")
    op.drop_column("debit_notes", "tcs_amount")
    op.drop_column("debit_notes", "tds_amount")
    op.drop_column("debit_notes", "additional_charges")
    op.drop_column("debit_notes", "discount_amount")

    op.drop_column("purchase_orders", "authorized_signatory_signature_url")
    op.drop_column("purchase_orders", "authorized_signatory_name")
    op.drop_column("purchase_orders", "terms_and_conditions")
    op.drop_column("purchase_orders", "payment_terms")
    op.drop_column("purchase_orders", "amount_paid")
    op.drop_column("purchase_orders", "tcs_amount")
    op.drop_column("purchase_orders", "tds_amount")
    op.drop_column("purchase_orders", "additional_charges")
