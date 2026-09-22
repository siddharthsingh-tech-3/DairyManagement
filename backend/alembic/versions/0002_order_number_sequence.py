"""order number sequence

Revision ID: 0002_order_number_sequence
Revises: 0001_initial_schema
Create Date: 2026-07-08 00:05:00

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_order_number_sequence"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1001")


def downgrade() -> None:
    op.execute("DROP SEQUENCE IF EXISTS order_number_seq")
