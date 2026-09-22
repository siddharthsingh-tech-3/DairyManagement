"""vendor profile fields, bank accounts, custom fields

Revision ID: 0006_vendor_profile
Revises: 0005_vendor_category
Create Date: 2026-07-10 02:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_vendor_profile"
down_revision: Union[str, None] = "0005_vendor_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vendors", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("vendors", sa.Column("pan_number", sa.String(10), nullable=True))
    op.add_column("vendors", sa.Column("billing_street", sa.String(255), nullable=True))
    op.add_column("vendors", sa.Column("billing_city", sa.String(100), nullable=True))
    op.add_column("vendors", sa.Column("billing_state", sa.String(100), nullable=True))
    op.add_column("vendors", sa.Column("billing_pincode", sa.String(10), nullable=True))
    op.add_column("vendors", sa.Column("shipping_street", sa.String(255), nullable=True))
    op.add_column("vendors", sa.Column("shipping_city", sa.String(100), nullable=True))
    op.add_column("vendors", sa.Column("shipping_state", sa.String(100), nullable=True))
    op.add_column("vendors", sa.Column("shipping_pincode", sa.String(10), nullable=True))
    op.add_column(
        "vendors", sa.Column("credit_period_days", sa.Integer(), nullable=False, server_default="0")
    )

    # Migrate any existing free-text address into billing_street before dropping it.
    op.execute("UPDATE vendors SET billing_street = address WHERE address IS NOT NULL")
    op.drop_column("vendors", "address")

    op.create_table(
        "vendor_bank_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="CASCADE", name="fk_vendor_bank_accounts_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column("account_holder_name", sa.String(150), nullable=False),
        sa.Column("account_number", sa.String(30), nullable=False),
        sa.Column("ifsc_code", sa.String(11), nullable=False),
        sa.Column("bank_name", sa.String(150), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "vendor_custom_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vendor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vendors.id", ondelete="CASCADE", name="fk_vendor_custom_fields_vendor_id_vendors"),
            nullable=False,
        ),
        sa.Column("field_name", sa.String(100), nullable=False),
        sa.Column("field_value", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("vendor_custom_fields")
    op.drop_table("vendor_bank_accounts")

    op.add_column("vendors", sa.Column("address", sa.Text(), nullable=True))
    op.execute("UPDATE vendors SET address = billing_street WHERE billing_street IS NOT NULL")

    op.drop_column("vendors", "credit_period_days")
    op.drop_column("vendors", "shipping_pincode")
    op.drop_column("vendors", "shipping_state")
    op.drop_column("vendors", "shipping_city")
    op.drop_column("vendors", "shipping_street")
    op.drop_column("vendors", "billing_pincode")
    op.drop_column("vendors", "billing_state")
    op.drop_column("vendors", "billing_city")
    op.drop_column("vendors", "billing_street")
    op.drop_column("vendors", "pan_number")
    op.drop_column("vendors", "email")
