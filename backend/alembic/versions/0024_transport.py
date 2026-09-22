"""transport (transport zones, purchase item categories, transport master,
transport bills)

Revision ID: 0024_transport
Revises: 0023_business_partners
Create Date: 2026-08-23 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0024_transport"
down_revision: Union[str, None] = "0023_business_partners"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TRANSPORT_OWNERSHIP_VALUES = ("own", "rent")


def _created_by_column() -> sa.Column:
    return sa.Column(
        "created_by",
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*TRANSPORT_OWNERSHIP_VALUES, name="transport_ownership").create(bind, checkfirst=True)

    op.create_table(
        "transport_zones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transport_zones_name", "transport_zones", ["name"], unique=True)

    op.create_table(
        "purchase_item_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_purchase_item_categories_name", "purchase_item_categories", ["name"], unique=True)

    op.create_table(
        "transports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("vehicle_number", sa.String(20), nullable=False),
        sa.Column(
            "ownership",
            postgresql.ENUM(*TRANSPORT_OWNERSHIP_VALUES, name="transport_ownership", create_type=False),
            nullable=False,
        ),
        sa.Column("measure", sa.String(50), nullable=False),
        sa.Column("transport_average", sa.Numeric(10, 2), nullable=False),
        sa.Column("diesel_average", sa.Numeric(10, 2), nullable=False),
        sa.Column("km_running_track", sa.Numeric(12, 2), nullable=False),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transports_vehicle_number", "transports", ["vehicle_number"], unique=True)

    op.create_table(
        "transport_bills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bill_date", sa.Date(), nullable=False),
        sa.Column(
            "transport_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transports.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("vehicle_number", sa.String(20), nullable=False),
        sa.Column(
            "zone_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("transport_zones.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "purchase_item_category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("purchase_item_categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("bill_number", sa.String(50), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transport_bills_bill_date", "transport_bills", ["bill_date"])
    op.create_index("ix_transport_bills_transport_id", "transport_bills", ["transport_id"])
    op.create_index("ix_transport_bills_zone_id", "transport_bills", ["zone_id"])
    op.create_index(
        "ix_transport_bills_purchase_item_category_id", "transport_bills", ["purchase_item_category_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_transport_bills_purchase_item_category_id", table_name="transport_bills")
    op.drop_index("ix_transport_bills_zone_id", table_name="transport_bills")
    op.drop_index("ix_transport_bills_transport_id", table_name="transport_bills")
    op.drop_index("ix_transport_bills_bill_date", table_name="transport_bills")
    op.drop_table("transport_bills")

    op.drop_index("ix_transports_vehicle_number", table_name="transports")
    op.drop_table("transports")

    op.drop_index("ix_purchase_item_categories_name", table_name="purchase_item_categories")
    op.drop_table("purchase_item_categories")

    op.drop_index("ix_transport_zones_name", table_name="transport_zones")
    op.drop_table("transport_zones")

    bind = op.get_bind()
    postgresql.ENUM(name="transport_ownership").drop(bind, checkfirst=True)
