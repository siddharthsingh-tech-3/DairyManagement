"""payment out allocations against multiple purchase invoices

Revision ID: 0012_payment_out_allocations
Revises: 0011_party_ledger_columns
Create Date: 2026-07-24 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_payment_out_allocations"
down_revision: Union[str, None] = "0011_party_ledger_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payments_out", sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
    op.alter_column("payments_out", "discount_amount", server_default=None)

    op.create_table(
        "payment_out_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "payment_out_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("payments_out.id", ondelete="CASCADE", name="fk_payment_out_allocations_payment_out_id"),
            nullable=False,
        ),
        sa.Column(
            "purchase_invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "purchase_invoices.id",
                ondelete="RESTRICT",
                name="fk_payment_out_allocations_purchase_invoice_id",
            ),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.alter_column("payment_out_allocations", "discount", server_default=None)
    op.create_index("ix_payment_out_allocations_payment_out_id", "payment_out_allocations", ["payment_out_id"])
    op.create_index("ix_payment_out_allocations_purchase_invoice_id", "payment_out_allocations", ["purchase_invoice_id"])


def downgrade() -> None:
    op.drop_index("ix_payment_out_allocations_purchase_invoice_id", table_name="payment_out_allocations")
    op.drop_index("ix_payment_out_allocations_payment_out_id", table_name="payment_out_allocations")
    op.drop_table("payment_out_allocations")
    op.drop_column("payments_out", "discount_amount")
