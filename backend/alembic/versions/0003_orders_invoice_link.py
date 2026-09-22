"""link orders to invoices

Revision ID: 0003_orders_invoice_link
Revises: 0002_order_number_sequence
Create Date: 2026-07-08 00:10:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_orders_invoice_link"
down_revision: Union[str, None] = "0002_order_number_sequence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_orders_invoice_id_invoices", "orders", "invoices", ["invoice_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_orders_invoice_id", "orders", ["invoice_id"])
    op.execute("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1041")


def downgrade() -> None:
    op.execute("DROP SEQUENCE IF EXISTS invoice_number_seq")
    op.drop_index("ix_orders_invoice_id", table_name="orders")
    op.drop_constraint("fk_orders_invoice_id_invoices", "orders", type_="foreignkey")
    op.drop_column("orders", "invoice_id")
