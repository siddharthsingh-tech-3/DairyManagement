"""partner bank accounts and interest expectation on capital contributions

Revision ID: 0026_partner_bank_interest
Revises: 0025_loans
Create Date: 2026-09-12 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0026_partner_bank_interest"
down_revision: Union[str, None] = "0025_loans"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INTEREST_CALCULATION_METHOD_VALUES = ("simple", "compound")


def upgrade() -> None:
    op.create_table(
        "partner_bank_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("account_number", sa.String(30), nullable=False),
        sa.Column("account_holder_name", sa.String(150), nullable=True),
        sa.Column("bank_name", sa.String(150), nullable=True),
        sa.Column("ifsc_code", sa.String(11), nullable=True),
        sa.Column("branch_name", sa.String(150), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_bank_accounts_partner_id", "partner_bank_accounts", ["partner_id"])

    op.add_column("partner_capital_contributions", sa.Column("interest_rate", sa.Numeric(5, 2), nullable=True))
    op.add_column("partner_capital_contributions", sa.Column("interest_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column(
        "partner_capital_contributions",
        sa.Column(
            "interest_calculation_method",
            postgresql.ENUM(*INTEREST_CALCULATION_METHOD_VALUES, name="interest_calculation_method", create_type=False),
            nullable=True,
        ),
    )
    op.add_column("partner_capital_contributions", sa.Column("interest_effective_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("partner_capital_contributions", "interest_effective_date")
    op.drop_column("partner_capital_contributions", "interest_calculation_method")
    op.drop_column("partner_capital_contributions", "interest_amount")
    op.drop_column("partner_capital_contributions", "interest_rate")

    op.drop_index("ix_partner_bank_accounts_partner_id", table_name="partner_bank_accounts")
    op.drop_table("partner_bank_accounts")
