import uuid
from contextvars import ContextVar

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

current_tenant_id: ContextVar[uuid.UUID | None] = ContextVar("current_tenant_id", default=None)


async def set_tenant_context(db: AsyncSession, tenant_id: uuid.UUID) -> None:
    """Scopes the rest of this request to one tenant: sets the contextvar
    `app.db.tenant_scope`'s before_flush listener reads to stamp new rows, and
    sets the Postgres session variable the RLS policies filter on.

    Uses `set_config(..., is_local=false)` rather than `SET LOCAL` for two
    reasons: `SET`/`SET LOCAL` don't accept bind parameters over the Postgres
    extended query protocol (only plain function calls like `set_config` do),
    and a session-level (not transaction-level) setting means this survives a
    `commit()` mid-request/mid-test rather than silently reverting to
    unscoped. This is safe with a pooled connection because every authenticated
    request calls this again (via `get_current_user`) before touching any
    tenant-scoped table, so a stale value from a previous request on a reused
    connection is always overwritten before it could matter.
    """
    current_tenant_id.set(tenant_id)
    await db.execute(
        text("SELECT set_config('app.tenant_id', :tenant_id, false)"), {"tenant_id": str(tenant_id)}
    )
