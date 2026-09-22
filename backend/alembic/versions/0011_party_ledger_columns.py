"""party ledger voucher/status/tds columns

Revision ID: 0011_party_ledger_columns
Revises: 0010_invoice_bill_fields
Create Date: 2026-07-23 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_party_ledger_columns"
down_revision: Union[str, None] = "0010_invoice_bill_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vendor_ledger_entries", sa.Column("reference_number", sa.String(30), nullable=True))
    op.add_column("vendor_ledger_entries", sa.Column("status", sa.String(30), nullable=True))
    op.add_column(
        "vendor_ledger_entries",
        sa.Column("tds_deducted_by_party", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "vendor_ledger_entries",
        sa.Column("tds_deducted_by_self", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.alter_column("vendor_ledger_entries", "tds_deducted_by_party", server_default=None)
    op.alter_column("vendor_ledger_entries", "tds_deducted_by_self", server_default=None)

    op.add_column("payments", sa.Column("tds_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
    op.alter_column("payments", "tds_amount", server_default=None)


def downgrade() -> None:
    op.drop_column("payments", "tds_amount")
    op.drop_column("vendor_ledger_entries", "tds_deducted_by_self")
    op.drop_column("vendor_ledger_entries", "tds_deducted_by_party")
    op.drop_column("vendor_ledger_entries", "status")
    op.drop_column("vendor_ledger_entries", "reference_number")
