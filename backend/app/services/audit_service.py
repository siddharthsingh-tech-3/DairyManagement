import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    def log(
        self,
        actor_name: str,
        action: str,
        *,
        user_id: uuid.UUID | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                user_id=user_id,
                actor_name=actor_name,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
            )
        )

    async def list_recent(self, limit: int = 50) -> list[AuditLog]:
        result = await self.db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
        return list(result.scalars().all())
