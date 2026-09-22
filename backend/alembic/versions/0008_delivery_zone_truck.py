"""delivery zone and truck number

Revision ID: 0008_delivery_zone_truck
Revises: 0007_invoice_created_by
Create Date: 2026-07-12 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008_delivery_zone_truck"
down_revision: Union[str, None] = "0007_invoice_created_by"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("zone_1", "zone_2", name="delivery_zone").create(bind, checkfirst=True)

    op.add_column(
        "deliveries",
        sa.Column("zone", postgresql.ENUM("zone_1", "zone_2", name="delivery_zone", create_type=False), nullable=True),
    )
    op.add_column("deliveries", sa.Column("truck_number", sa.String(20), nullable=True))
    op.drop_column("deliveries", "route")
    op.drop_column("deliveries", "stop_no")


def downgrade() -> None:
    op.add_column("deliveries", sa.Column("route", sa.String(50), nullable=True))
    op.add_column("deliveries", sa.Column("stop_no", sa.Integer(), nullable=True))
    op.drop_column("deliveries", "truck_number")
    op.drop_column("deliveries", "zone")

    bind = op.get_bind()
    postgresql.ENUM(name="delivery_zone").drop(bind, checkfirst=True)
