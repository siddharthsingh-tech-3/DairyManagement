"""categories master list

Revision ID: 0019_categories
Revises: 0018_product_offers
Create Date: 2026-08-02 00:00:00

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0019_categories"
down_revision: Union[str, None] = "0018_product_offers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_categories_name"), "categories", ["name"], unique=True)

    # Backfill the master list from any category strings already in use on products.
    bind = op.get_bind()
    categories_table = sa.table(
        "categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    existing = bind.execute(
        sa.text("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category <> ''")
    ).scalars().all()
    if existing:
        now = datetime.now(timezone.utc)
        bind.execute(
            categories_table.insert(),
            [{"id": uuid.uuid4(), "name": name, "created_at": now, "updated_at": now} for name in existing],
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_categories_name"), table_name="categories")
    op.drop_table("categories")
