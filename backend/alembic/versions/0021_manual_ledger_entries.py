"""manual ledger entries for balance sheet (capital, loans, fixed assets, investments, loans advance)

Revision ID: 0021_manual_ledger_entries
Revises: 0020_product_item_details
Create Date: 2026-08-21 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0021_manual_ledger_entries"
down_revision: Union[str, None] = "0020_product_item_details"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LEDGER_ENTRY_CATEGORY_VALUES = ("capital", "loans", "fixed_assets", "investments", "loans_advance")


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*LEDGER_ENTRY_CATEGORY_VALUES, name="ledger_entry_category").create(bind, checkfirst=True)

    op.create_table(
        "manual_ledger_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "category",
            postgresql.ENUM(*LEDGER_ENTRY_CATEGORY_VALUES, name="ledger_entry_category", create_type=False),
            nullable=False,
        ),
        sa.Column("label", sa.String(150), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("entry_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL", name="fk_manual_ledger_entries_created_by_users"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_manual_ledger_entries_category", "manual_ledger_entries", ["category"])


def downgrade() -> None:
    op.drop_index("ix_manual_ledger_entries_category", table_name="manual_ledger_entries")
    op.drop_table("manual_ledger_entries")

    bind = op.get_bind()
    postgresql.ENUM(name="ledger_entry_category").drop(bind, checkfirst=True)
