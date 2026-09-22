"""product item type, online store flag, tax modes, discount, alt unit, low stock toggle, description

Revision ID: 0020_product_item_details
Revises: 0019_categories
Create Date: 2026-08-03 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020_product_item_details"
down_revision: Union[str, None] = "0019_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("item_type", sa.String(10), nullable=False, server_default="product"),
    )
    op.add_column(
        "products",
        sa.Column("show_in_online_store", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "products",
        sa.Column("sales_price_includes_tax", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "products",
        sa.Column("purchase_price_includes_tax", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column("products", sa.Column("discount_percent", sa.Numeric(5, 2), nullable=True))
    op.add_column("products", sa.Column("alternative_unit", sa.String(20), nullable=True))
    op.add_column(
        "products",
        sa.Column("low_stock_alert_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("products", sa.Column("opening_stock_date", sa.Date(), nullable=True))
    op.add_column("products", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "description")
    op.drop_column("products", "opening_stock_date")
    op.drop_column("products", "low_stock_alert_enabled")
    op.drop_column("products", "alternative_unit")
    op.drop_column("products", "discount_percent")
    op.drop_column("products", "purchase_price_includes_tax")
    op.drop_column("products", "sales_price_includes_tax")
    op.drop_column("products", "show_in_online_store")
    op.drop_column("products", "item_type")
