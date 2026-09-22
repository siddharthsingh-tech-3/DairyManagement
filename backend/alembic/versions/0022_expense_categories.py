"""expenses: free-form categories, line items, numbering, GST/payment fields

Revision ID: 0022_expense_categories
Revises: 0021_manual_ledger_entries
Create Date: 2026-08-21 00:00:00

"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0022_expense_categories"
down_revision: Union[str, None] = "0021_manual_ledger_entries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_ENUM_VALUES = ("fuel", "salary", "rent", "wastage", "other")


def upgrade() -> None:
    op.create_table(
        "expense_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(op.f("ix_expense_categories_name"), "expense_categories", ["name"], unique=True)

    op.create_table(
        "expense_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "expense_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("expenses.id", ondelete="CASCADE", name="fk_expense_items_expense_id_expenses"),
            nullable=False,
        ),
        sa.Column("description", sa.String(150), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("tax_percent", sa.Numeric(4, 2), nullable=False, server_default="0"),
    )
    op.create_index("ix_expense_items_expense_id", "expense_items", ["expense_id"])

    op.add_column("expenses", sa.Column("expense_number", sa.String(50), nullable=True))
    op.create_index(op.f("ix_expenses_expense_number"), "expenses", ["expense_number"], unique=True)
    op.add_column("expenses", sa.Column("payment_mode", sa.String(30), nullable=True))
    op.add_column("expenses", sa.Column("original_invoice_number", sa.String(50), nullable=True))
    op.add_column(
        "expenses", sa.Column("is_gst_applicable", sa.Boolean(), nullable=False, server_default=sa.false())
    )

    # category: fixed 5-value enum -> free-form string, same shift Product.category already made.
    op.alter_column(
        "expenses",
        "category",
        type_=sa.String(50),
        postgresql_using="category::text",
    )

    bind = op.get_bind()
    expense_categories = sa.table(
        "expense_categories",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    existing = bind.execute(
        sa.text("SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL AND category <> ''")
    ).scalars().all()
    if existing:
        now = datetime.now(timezone.utc)
        bind.execute(
            expense_categories.insert(),
            [{"id": uuid.uuid4(), "name": name.title(), "created_at": now, "updated_at": now} for name in existing],
        )
        for name in existing:
            bind.execute(
                sa.text("UPDATE expenses SET category = :new_name WHERE category = :old_name"),
                {"new_name": name.title(), "old_name": name},
            )

    op.execute("DROP TYPE expense_category")


def downgrade() -> None:
    postgresql.ENUM(*OLD_ENUM_VALUES, name="expense_category").create(op.get_bind(), checkfirst=True)

    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE expenses SET category = 'other' WHERE lower(category) NOT IN :allowed"
        ).bindparams(sa.bindparam("allowed", expanding=True)),
        {"allowed": list(OLD_ENUM_VALUES)},
    )
    bind.execute(sa.text("UPDATE expenses SET category = lower(category)"))

    op.alter_column(
        "expenses",
        "category",
        type_=postgresql.ENUM(*OLD_ENUM_VALUES, name="expense_category", create_type=False),
        postgresql_using="category::expense_category",
    )

    op.drop_column("expenses", "is_gst_applicable")
    op.drop_column("expenses", "original_invoice_number")
    op.drop_column("expenses", "payment_mode")
    op.drop_index(op.f("ix_expenses_expense_number"), table_name="expenses")
    op.drop_column("expenses", "expense_number")

    op.drop_index("ix_expense_items_expense_id", table_name="expense_items")
    op.drop_table("expense_items")

    op.drop_index(op.f("ix_expense_categories_name"), table_name="expense_categories")
    op.drop_table("expense_categories")
