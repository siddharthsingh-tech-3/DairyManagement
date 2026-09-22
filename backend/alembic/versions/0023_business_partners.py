"""business partners (identity, tax, capital, profit share, drawings, remuneration,
interest, loans, joint liabilities, operational responsibilities)

Revision ID: 0023_business_partners
Revises: 0022_expense_categories
Create Date: 2026-08-23 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0023_business_partners"
down_revision: Union[str, None] = "0022_expense_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PARTNER_STATUS_VALUES = ("active", "inactive")
CONTRIBUTION_TYPE_VALUES = ("initial", "additional")
REMUNERATION_TYPE_VALUES = ("salary", "commission", "bonus", "other")
REMUNERATION_FREQUENCY_VALUES = ("monthly", "quarterly", "annually", "one_time")
INTEREST_CALCULATION_METHOD_VALUES = ("simple", "compound")
INTEREST_PAYMENT_STATUS_VALUES = ("pending", "paid")
LOAN_STATUS_VALUES = ("active", "closed", "defaulted")
LIABILITY_STATUS_VALUES = ("pending", "partial", "settled", "overdue")


def _created_by_column() -> sa.Column:
    return sa.Column(
        "created_by",
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*PARTNER_STATUS_VALUES, name="partner_status").create(bind, checkfirst=True)
    postgresql.ENUM(*CONTRIBUTION_TYPE_VALUES, name="capital_contribution_type").create(bind, checkfirst=True)
    postgresql.ENUM(*REMUNERATION_TYPE_VALUES, name="remuneration_type").create(bind, checkfirst=True)
    postgresql.ENUM(*REMUNERATION_FREQUENCY_VALUES, name="remuneration_frequency").create(bind, checkfirst=True)
    postgresql.ENUM(*INTEREST_CALCULATION_METHOD_VALUES, name="interest_calculation_method").create(bind, checkfirst=True)
    postgresql.ENUM(*INTEREST_PAYMENT_STATUS_VALUES, name="interest_payment_status").create(bind, checkfirst=True)
    postgresql.ENUM(*LOAN_STATUS_VALUES, name="loan_status").create(bind, checkfirst=True)
    postgresql.ENUM(*LIABILITY_STATUS_VALUES, name="liability_status").create(bind, checkfirst=True)

    op.create_table(
        "business_partners",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("tin", sa.String(30), nullable=True),
        sa.Column("pan_number", sa.String(10), nullable=True),
        sa.Column("gstin", sa.String(20), nullable=True),
        sa.Column("other_tax_details", sa.String(500), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(*PARTNER_STATUS_VALUES, name="partner_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("opening_capital_balance", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("opening_balance_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_business_partners_status", "business_partners", ["status"])
    op.create_index("ix_business_partners_name", "business_partners", ["name"])

    op.create_table(
        "partner_capital_contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contribution_type",
            postgresql.ENUM(*CONTRIBUTION_TYPE_VALUES, name="capital_contribution_type", create_type=False),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("contribution_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_partner_capital_contributions_partner_id", "partner_capital_contributions", ["partner_id"]
    )

    op.create_table(
        "partner_profit_loss_ratios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("profit_percentage", sa.Numeric(5, 2), nullable=False),
        sa.Column("loss_percentage", sa.Numeric(5, 2), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(255), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_profit_loss_ratios_partner_id", "partner_profit_loss_ratios", ["partner_id"])

    op.create_table(
        "partner_drawings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("drawing_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_drawings_partner_id", "partner_drawings", ["partner_id"])

    op.create_table(
        "partner_profit_loss_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("allocation_date", sa.Date(), nullable=False),
        sa.Column("period_label", sa.String(100), nullable=True),
        sa.Column("note", sa.String(255), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_partner_profit_loss_allocations_partner_id", "partner_profit_loss_allocations", ["partner_id"]
    )

    op.create_table(
        "partner_remunerations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "remuneration_type",
            postgresql.ENUM(*REMUNERATION_TYPE_VALUES, name="remuneration_type", create_type=False),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "frequency",
            postgresql.ENUM(*REMUNERATION_FREQUENCY_VALUES, name="remuneration_frequency", create_type=False),
            nullable=False,
        ),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_remunerations_partner_id", "partner_remunerations", ["partner_id"])

    op.create_table(
        "partner_capital_interest",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("interest_rate", sa.Numeric(5, 2), nullable=False),
        sa.Column(
            "calculation_method",
            postgresql.ENUM(*INTEREST_CALCULATION_METHOD_VALUES, name="interest_calculation_method", create_type=False),
            nullable=False,
        ),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("interest_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "payment_status",
            postgresql.ENUM(*INTEREST_PAYMENT_STATUS_VALUES, name="interest_payment_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_capital_interest_partner_id", "partner_capital_interest", ["partner_id"])

    op.create_table(
        "partner_loans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("loan_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("loan_date", sa.Date(), nullable=False),
        sa.Column("interest_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("repayment_terms", sa.String(255), nullable=True),
        sa.Column("outstanding_balance", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "loan_status",
            postgresql.ENUM(*LOAN_STATUS_VALUES, name="loan_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_loans_partner_id", "partner_loans", ["partner_id"])

    op.create_table(
        "partner_joint_liabilities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("liability_type", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("total_liability_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("share_percentage", sa.Numeric(5, 2), nullable=False),
        sa.Column("outstanding_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(*LIABILITY_STATUS_VALUES, name="liability_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_joint_liabilities_partner_id", "partner_joint_liabilities", ["partner_id"])

    op.create_table(
        "partner_responsibilities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "partner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("business_partners.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role_title", sa.String(150), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("financial_decision_authority", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("approval_authority", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(500), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_partner_responsibilities_partner_id", "partner_responsibilities", ["partner_id"])


def downgrade() -> None:
    op.drop_index("ix_partner_responsibilities_partner_id", table_name="partner_responsibilities")
    op.drop_table("partner_responsibilities")
    op.drop_index("ix_partner_joint_liabilities_partner_id", table_name="partner_joint_liabilities")
    op.drop_table("partner_joint_liabilities")
    op.drop_index("ix_partner_loans_partner_id", table_name="partner_loans")
    op.drop_table("partner_loans")
    op.drop_index("ix_partner_capital_interest_partner_id", table_name="partner_capital_interest")
    op.drop_table("partner_capital_interest")
    op.drop_index("ix_partner_remunerations_partner_id", table_name="partner_remunerations")
    op.drop_table("partner_remunerations")
    op.drop_index("ix_partner_profit_loss_allocations_partner_id", table_name="partner_profit_loss_allocations")
    op.drop_table("partner_profit_loss_allocations")
    op.drop_index("ix_partner_drawings_partner_id", table_name="partner_drawings")
    op.drop_table("partner_drawings")
    op.drop_index("ix_partner_profit_loss_ratios_partner_id", table_name="partner_profit_loss_ratios")
    op.drop_table("partner_profit_loss_ratios")
    op.drop_index("ix_partner_capital_contributions_partner_id", table_name="partner_capital_contributions")
    op.drop_table("partner_capital_contributions")
    op.drop_index("ix_business_partners_name", table_name="business_partners")
    op.drop_index("ix_business_partners_status", table_name="business_partners")
    op.drop_table("business_partners")

    bind = op.get_bind()
    postgresql.ENUM(name="liability_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="loan_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="interest_payment_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="interest_calculation_method").drop(bind, checkfirst=True)
    postgresql.ENUM(name="remuneration_frequency").drop(bind, checkfirst=True)
    postgresql.ENUM(name="remuneration_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="capital_contribution_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="partner_status").drop(bind, checkfirst=True)
