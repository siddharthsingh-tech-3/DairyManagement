"""purchase invoice bill fields

Revision ID: 0010_invoice_bill_fields
Revises: 0009_purchases_module
Create Date: 2026-07-23 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_invoice_bill_fields"
down_revision: Union[str, None] = "0009_purchases_module"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "purchase_invoices",
        sa.Column("additional_charges", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column("purchase_invoices", sa.Column("payment_terms", sa.String(100), nullable=True))
    op.add_column("purchase_invoices", sa.Column("terms_and_conditions", sa.String(1000), nullable=True))
    op.add_column("purchase_invoices", sa.Column("authorized_signatory_name", sa.String(150), nullable=True))
    op.add_column(
        "purchase_invoices", sa.Column("authorized_signatory_signature_url", sa.String(300), nullable=True)
    )
    op.alter_column("purchase_invoices", "additional_charges", server_default=None)


def downgrade() -> None:
    op.drop_column("purchase_invoices", "authorized_signatory_signature_url")
    op.drop_column("purchase_invoices", "authorized_signatory_name")
    op.drop_column("purchase_invoices", "terms_and_conditions")
    op.drop_column("purchase_invoices", "payment_terms")
    op.drop_column("purchase_invoices", "additional_charges")
