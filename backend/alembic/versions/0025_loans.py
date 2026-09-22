"""loan management (loans taken/given, repayment schedule, repayments, ledger entries)

Revision ID: 0025_loans
Revises: 0024_transport
Create Date: 2026-08-23 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0025_loans"
down_revision: Union[str, None] = "0024_transport"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LOAN_TYPE_VALUES = ("taken", "given")
LOAN_PARTY_TYPE_VALUES = ("vendor", "business_partner", "other")
REPAYMENT_FREQUENCY_VALUES = ("monthly", "quarterly", "half_yearly", "yearly")
INSTALLMENT_STATUS_VALUES = ("upcoming", "due", "partially_paid", "paid", "overdue")
LOAN_RECORD_STATUS_VALUES = ("active", "closed", "defaulted", "cancelled")
LOAN_LEDGER_ENTRY_TYPE_VALUES = (
    "disbursement",
    "principal_repayment",
    "interest_repayment",
    "tax_deduction",
    "adjustment",
    "cancellation",
)

# Reused as-is from earlier migrations (0023 created these types) — referenced here
# with create_type=False, never recreated or altered.
INTEREST_CALCULATION_METHOD_VALUES = ("simple", "compound")
PAYMENT_METHOD_VALUES = ("upi", "cod", "pay_later", "cash", "bank")


def _created_by_column() -> sa.Column:
    return sa.Column(
        "created_by",
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*LOAN_TYPE_VALUES, name="loan_type").create(bind, checkfirst=True)
    postgresql.ENUM(*LOAN_PARTY_TYPE_VALUES, name="loan_party_type").create(bind, checkfirst=True)
    postgresql.ENUM(*REPAYMENT_FREQUENCY_VALUES, name="repayment_frequency").create(bind, checkfirst=True)
    postgresql.ENUM(*INSTALLMENT_STATUS_VALUES, name="installment_status").create(bind, checkfirst=True)
    postgresql.ENUM(*LOAN_RECORD_STATUS_VALUES, name="loan_record_status").create(bind, checkfirst=True)
    postgresql.ENUM(*LOAN_LEDGER_ENTRY_TYPE_VALUES, name="loan_ledger_entry_type").create(bind, checkfirst=True)

    op.create_table(
        "loans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("loan_number", sa.String(30), nullable=False),
        sa.Column(
            "loan_type",
            postgresql.ENUM(*LOAN_TYPE_VALUES, name="loan_type", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "party_type",
            postgresql.ENUM(*LOAN_PARTY_TYPE_VALUES, name="loan_party_type", create_type=False),
            nullable=False,
        ),
        sa.Column("party_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("party_name", sa.String(150), nullable=False),
        sa.Column("principal_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("loan_date", sa.Date(), nullable=False),
        sa.Column(
            "disbursement_method",
            postgresql.ENUM(*PAYMENT_METHOD_VALUES, name="payment_method", create_type=False),
            nullable=False,
        ),
        sa.Column("interest_rate", sa.Numeric(5, 2), nullable=False),
        sa.Column(
            "interest_type",
            postgresql.ENUM(*INTEREST_CALCULATION_METHOD_VALUES, name="interest_calculation_method", create_type=False),
            nullable=False,
        ),
        sa.Column("tenure_months", sa.Integer(), nullable=False),
        sa.Column(
            "repayment_frequency",
            postgresql.ENUM(*REPAYMENT_FREQUENCY_VALUES, name="repayment_frequency", create_type=False),
            nullable=False,
        ),
        sa.Column("first_repayment_date", sa.Date(), nullable=False),
        sa.Column("maturity_date", sa.Date(), nullable=False),
        sa.Column("tax_type", sa.String(30), nullable=True),
        sa.Column("tax_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("outstanding_principal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("outstanding_interest", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_interest", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("paid_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column(
            "status",
            postgresql.ENUM(*LOAN_RECORD_STATUS_VALUES, name="loan_record_status", create_type=False),
            nullable=False,
            server_default="active",
        ),
        sa.Column("notes", sa.String(500), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_loans_loan_number", "loans", ["loan_number"], unique=True)
    op.create_index("ix_loans_loan_type", "loans", ["loan_type"])
    op.create_index("ix_loans_status", "loans", ["status"])
    op.create_index("ix_loans_party_id", "loans", ["party_id"])
    op.create_index("ix_loans_loan_date", "loans", ["loan_date"])

    op.create_table(
        "loan_repayment_installments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "loan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("installment_number", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("opening_principal", sa.Numeric(12, 2), nullable=False),
        sa.Column("principal_component", sa.Numeric(12, 2), nullable=False),
        sa.Column("interest_component", sa.Numeric(12, 2), nullable=False),
        sa.Column("tax_component", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total_installment_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column(
            "status",
            postgresql.ENUM(*INSTALLMENT_STATUS_VALUES, name="installment_status", create_type=False),
            nullable=False,
            server_default="upcoming",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_loan_repayment_installments_loan_id", "loan_repayment_installments", ["loan_id"]
    )
    op.create_index(
        "ix_loan_repayment_installments_due_date", "loan_repayment_installments", ["due_date"]
    )
    op.create_index(
        "ix_loan_repayment_installments_status", "loan_repayment_installments", ["status"]
    )

    op.create_table(
        "loan_repayments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "loan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "installment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("loan_repayment_installments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column(
            "method",
            postgresql.ENUM(*PAYMENT_METHOD_VALUES, name="payment_method", create_type=False),
            nullable=False,
        ),
        sa.Column("principal_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("interest_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("tax_deduction_date", sa.Date(), nullable=True),
        sa.Column("tax_reference", sa.String(100), nullable=True),
        sa.Column("reference", sa.String(100), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_loan_repayments_loan_id", "loan_repayments", ["loan_id"])
    op.create_index("ix_loan_repayments_installment_id", "loan_repayments", ["installment_id"])

    op.create_table(
        "loan_ledger_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "loan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "entry_type",
            postgresql.ENUM(*LOAN_LEDGER_ENTRY_TYPE_VALUES, name="loan_ledger_entry_type", create_type=False),
            nullable=False,
        ),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("debit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("credit", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("reference_type", sa.String(30), nullable=True),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True), nullable=True),
        _created_by_column(),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_loan_ledger_entries_loan_id", "loan_ledger_entries", ["loan_id"])


def downgrade() -> None:
    op.drop_index("ix_loan_ledger_entries_loan_id", table_name="loan_ledger_entries")
    op.drop_table("loan_ledger_entries")

    op.drop_index("ix_loan_repayments_installment_id", table_name="loan_repayments")
    op.drop_index("ix_loan_repayments_loan_id", table_name="loan_repayments")
    op.drop_table("loan_repayments")

    op.drop_index("ix_loan_repayment_installments_status", table_name="loan_repayment_installments")
    op.drop_index("ix_loan_repayment_installments_due_date", table_name="loan_repayment_installments")
    op.drop_index("ix_loan_repayment_installments_loan_id", table_name="loan_repayment_installments")
    op.drop_table("loan_repayment_installments")

    op.drop_index("ix_loans_loan_date", table_name="loans")
    op.drop_index("ix_loans_party_id", table_name="loans")
    op.drop_index("ix_loans_status", table_name="loans")
    op.drop_index("ix_loans_loan_type", table_name="loans")
    op.drop_index("ix_loans_loan_number", table_name="loans")
    op.drop_table("loans")

    bind = op.get_bind()
    postgresql.ENUM(name="loan_ledger_entry_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="loan_record_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="installment_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="repayment_frequency").drop(bind, checkfirst=True)
    postgresql.ENUM(name="loan_party_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="loan_type").drop(bind, checkfirst=True)
