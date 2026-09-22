"""credit note, delivery challan, proforma invoice bill fields

Revision ID: 0017_cn_challan_proforma_bill
Revises: 0016_sales_return_bill_fields
Create Date: 2026-08-02 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017_cn_challan_proforma_bill"
down_revision: Union[str, None] = "0016_sales_return_bill_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FULL_BILL_TABLES = ["credit_notes", "delivery_challans"]


def upgrade() -> None:
    for table in _FULL_BILL_TABLES:
        op.add_column(table, sa.Column("discount_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("additional_charges", sa.Numeric(12, 2), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("tds_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("tcs_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("round_off", sa.Numeric(12, 2), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"))
        op.add_column(table, sa.Column("payment_terms", sa.String(100), nullable=True))
        op.add_column(table, sa.Column("terms_and_conditions", sa.String(1000), nullable=True))
        op.add_column(table, sa.Column("authorized_signatory_name", sa.String(150), nullable=True))
        op.add_column(table, sa.Column("authorized_signatory_signature_url", sa.String(300), nullable=True))
        op.alter_column(table, "discount_amount", server_default=None)
        op.alter_column(table, "additional_charges", server_default=None)
        op.alter_column(table, "tds_amount", server_default=None)
        op.alter_column(table, "tcs_amount", server_default=None)
        op.alter_column(table, "round_off", server_default=None)
        op.alter_column(table, "amount_paid", server_default=None)

    # proforma_invoices already has discount_amount and round_off
    op.add_column(
        "proforma_invoices",
        sa.Column("additional_charges", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "proforma_invoices", sa.Column("tds_amount", sa.Numeric(12, 2), nullable=False, server_default="0")
    )
    op.add_column(
        "proforma_invoices", sa.Column("tcs_amount", sa.Numeric(12, 2), nullable=False, server_default="0")
    )
    op.add_column(
        "proforma_invoices", sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0")
    )
    op.add_column("proforma_invoices", sa.Column("payment_terms", sa.String(100), nullable=True))
    op.add_column("proforma_invoices", sa.Column("terms_and_conditions", sa.String(1000), nullable=True))
    op.add_column("proforma_invoices", sa.Column("authorized_signatory_name", sa.String(150), nullable=True))
    op.add_column(
        "proforma_invoices", sa.Column("authorized_signatory_signature_url", sa.String(300), nullable=True)
    )
    op.alter_column("proforma_invoices", "additional_charges", server_default=None)
    op.alter_column("proforma_invoices", "tds_amount", server_default=None)
    op.alter_column("proforma_invoices", "tcs_amount", server_default=None)
    op.alter_column("proforma_invoices", "amount_paid", server_default=None)


def downgrade() -> None:
    op.drop_column("proforma_invoices", "authorized_signatory_signature_url")
    op.drop_column("proforma_invoices", "authorized_signatory_name")
    op.drop_column("proforma_invoices", "terms_and_conditions")
    op.drop_column("proforma_invoices", "payment_terms")
    op.drop_column("proforma_invoices", "amount_paid")
    op.drop_column("proforma_invoices", "tcs_amount")
    op.drop_column("proforma_invoices", "tds_amount")
    op.drop_column("proforma_invoices", "additional_charges")

    for table in reversed(_FULL_BILL_TABLES):
        op.drop_column(table, "authorized_signatory_signature_url")
        op.drop_column(table, "authorized_signatory_name")
        op.drop_column(table, "terms_and_conditions")
        op.drop_column(table, "payment_terms")
        op.drop_column(table, "amount_paid")
        op.drop_column(table, "round_off")
        op.drop_column(table, "tcs_amount")
        op.drop_column(table, "tds_amount")
        op.drop_column(table, "additional_charges")
        op.drop_column(table, "discount_amount")
