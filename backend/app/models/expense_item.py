import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDPrimaryKeyMixin


class ExpenseItem(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "expense_items"

    expense_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(String(150), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_percent: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=Decimal("0"))

    expense: Mapped["Expense"] = relationship(back_populates="items")
