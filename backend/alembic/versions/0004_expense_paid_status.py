"""expense payee and paid status

Revision ID: 0004_expense_paid_status
Revises: 0003_orders_invoice_link
Create Date: 2026-07-10 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_expense_paid_status"
down_revision: Union[str, None] = "0003_orders_invoice_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("payee", sa.String(150), nullable=True))
    op.add_column(
        "expenses", sa.Column("is_paid", sa.Boolean(), nullable=False, server_default=sa.true())
    )


def downgrade() -> None:
    op.drop_column("expenses", "is_paid")
    op.drop_column("expenses", "payee")
