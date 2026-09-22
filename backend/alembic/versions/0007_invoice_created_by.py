"""invoice created_by

Revision ID: 0007_invoice_created_by
Revises: 0006_vendor_profile
Create Date: 2026-07-11 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_invoice_created_by"
down_revision: Union[str, None] = "0006_vendor_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("created_by", sa.String(150), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "created_by")
