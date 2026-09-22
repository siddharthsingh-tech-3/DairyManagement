"""sales return bill fields

Revision ID: 0016_sales_return_bill_fields
Revises: 0015_order_debit_note_fields
Create Date: 2026-08-02 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016_sales_return_bill_fields"
down_revision: Union[str, None] = "0015_order_debit_note_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sales_returns",
        sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "sales_returns",
        sa.Column("additional_charges", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "sales_returns",
        sa.Column("tds_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "sales_returns",
        sa.Column("tcs_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "sales_returns",
        sa.Column("round_off", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "sales_returns",
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column("sales_returns", sa.Column("payment_terms", sa.String(100), nullable=True))
    op.add_column("sales_returns", sa.Column("terms_and_conditions", sa.String(1000), nullable=True))
    op.add_column("sales_returns", sa.Column("authorized_signatory_name", sa.String(150), nullable=True))
    op.add_column(
        "sales_returns", sa.Column("authorized_signatory_signature_url", sa.String(300), nullable=True)
    )
    op.alter_column("sales_returns", "discount_amount", server_default=None)
    op.alter_column("sales_returns", "additional_charges", server_default=None)
    op.alter_column("sales_returns", "tds_amount", server_default=None)
    op.alter_column("sales_returns", "tcs_amount", server_default=None)
    op.alter_column("sales_returns", "round_off", server_default=None)
    op.alter_column("sales_returns", "amount_paid", server_default=None)


def downgrade() -> None:
    op.drop_column("sales_returns", "authorized_signatory_signature_url")
    op.drop_column("sales_returns", "authorized_signatory_name")
    op.drop_column("sales_returns", "terms_and_conditions")
    op.drop_column("sales_returns", "payment_terms")
    op.drop_column("sales_returns", "amount_paid")
    op.drop_column("sales_returns", "round_off")
    op.drop_column("sales_returns", "tcs_amount")
    op.drop_column("sales_returns", "tds_amount")
    op.drop_column("sales_returns", "additional_charges")
    op.drop_column("sales_returns", "discount_amount")
