"""product category/purchase price + offers module

Revision ID: 0018_product_offers
Revises: 0017_cn_challan_proforma_bill
Create Date: 2026-08-02 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0018_product_offers"
down_revision: Union[str, None] = "0017_cn_challan_proforma_bill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    op.add_column("products", sa.Column("category", sa.String(50), nullable=True))
    op.create_index(op.f("ix_products_category"), "products", ["category"])
    op.add_column("products", sa.Column("purchase_price", sa.Numeric(10, 2), nullable=True))

    postgresql.ENUM("percent", "flat", name="offer_discount_type").create(bind, checkfirst=True)

    op.create_table(
        "offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "discount_type",
            postgresql.ENUM("percent", "flat", name="offer_discount_type", create_type=False),
            nullable=False,
        ),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_till", sa.Date(), nullable=True),
        sa.Column("applies_to_all", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_table(
        "offer_products",
        sa.Column(
            "offer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("offers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("offer_products")
    op.drop_table("offers")
    postgresql.ENUM(name="offer_discount_type").drop(op.get_bind(), checkfirst=True)

    op.drop_column("products", "purchase_price")
    op.drop_index(op.f("ix_products_category"), table_name="products")
    op.drop_column("products", "category")
