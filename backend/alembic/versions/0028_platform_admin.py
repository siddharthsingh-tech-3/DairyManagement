"""platform admin flag

Adds `users.is_platform_admin` — orthogonal to `role`/the per-tenant permission
matrix, grants cross-tenant platform operations (list/create/suspend tenants).
See app/api/v1/tenants.py.

Revision ID: 0028_platform_admin
Revises: 0027_multi_tenant
Create Date: 2026-09-23 00:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0028_platform_admin"
down_revision: Union[str, None] = "0027_multi_tenant"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_platform_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "is_platform_admin")
