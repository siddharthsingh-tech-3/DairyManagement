import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem
from app.repositories.document_numbering import DocumentNumberingMixin


class OrderRepository(DocumentNumberingMixin):
    DOCUMENT_DEFAULT_PREFIXES = {"order": "ORD-"}
    DOCUMENT_STARTING_SEQ = {"order": "1001"}

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def next_order_no(self) -> str:
        return await self.next_document_number("order")

    async def get_by_id(self, order_id: uuid.UUID) -> Order | None:
        result = await self.db.execute(
            select(Order).where(Order.id == order_id).options(selectinload(Order.items))
        )
        return result.scalar_one_or_none()

    async def list_orders(self, vendor_id: uuid.UUID | None = None, status: str | None = None) -> list[Order]:
        stmt = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
        if vendor_id is not None:
            stmt = stmt.where(Order.vendor_id == vendor_id)
        if status is not None:
            stmt = stmt.where(Order.status == status)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    def add(self, order: Order) -> None:
        self.db.add(order)

    def add_item(self, item: OrderItem) -> None:
        self.db.add(item)
