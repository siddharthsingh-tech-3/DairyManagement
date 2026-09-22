"""vendor category

Revision ID: 0005_vendor_category
Revises: 0004_expense_paid_status
Create Date: 2026-07-10 01:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_vendor_category"
down_revision: Union[str, None] = "0004_expense_paid_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vendors", sa.Column("category", sa.String(50), nullable=True))
    op.create_index("ix_vendors_category", "vendors", ["category"])


def downgrade() -> None:
    op.drop_index("ix_vendors_category", table_name="vendors")
    op.drop_column("vendors", "category")
