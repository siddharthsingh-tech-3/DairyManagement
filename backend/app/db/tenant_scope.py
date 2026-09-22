from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy.orm import Session

from app.core.tenant_context import current_tenant_id
from app.db.base import Base

# `users` has a tenant_id column (every user belongs to one tenant) but is
# deliberately excluded from row-level security — see app.dependencies.auth.
RLS_EXCLUDED_TABLES = {"users"}


def _stamp_new_objects(session: Session, flush_context, instances) -> None:  # noqa: ANN001
    tenant_id = current_tenant_id.get()
    if tenant_id is None:
        return
    for obj in session.new:
        if hasattr(obj, "tenant_id") and obj.tenant_id is None:
            obj.tenant_id = tenant_id


def register_tenant_stamping() -> None:
    event.listen(Session, "before_flush", _stamp_new_objects)


def tenant_scoped_tables() -> list[str]:
    """Every table with a `tenant_id` column, except the deliberate RLS
    exceptions. Derived from live model metadata (not a hardcoded list) so it
    can't drift from the models — used by tests to recreate the same RLS
    policies the multi-tenant migration adds in real Postgres environments."""
    return [
        table.name
        for table in Base.metadata.sorted_tables
        if "tenant_id" in table.columns and table.name not in RLS_EXCLUDED_TABLES
    ]


async def enable_row_level_security(conn: AsyncConnection) -> None:
    """Applies the same RLS policy the multi-tenant migration creates, for use
    against a test database built from `Base.metadata.create_all` rather than
    `alembic upgrade head` (which doesn't run DDL SQLAlchemy metadata can't
    express, like `CREATE POLICY`).

    `nullif(current_setting(...), '')` matters: once a session has called
    `set_config('app.tenant_id', ...)` at least once, a later `RESET` reverts
    it to an empty string rather than true NULL, and casting `''::uuid`
    raises a hard error instead of just filtering out every row."""
    for table in tenant_scoped_tables():
        await conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
        await conn.execute(text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))
        await conn.execute(
            text(
                f"CREATE POLICY tenant_isolation ON {table} "
                "USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) "
                "WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)"
            )
        )
