import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Expense(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "expenses"
    __table_args__ = (
        UniqueConstraint("tenant_id", "expense_number", name="uq_expenses_tenant_expense_number"),
    )

    expense_number: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    payee: Mapped[str | None] = mapped_column(String(150), nullable=True)
    payment_mode: Mapped[str | None] = mapped_column(String(30), nullable=True)
    original_invoice_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_gst_applicable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    items: Mapped[list["ExpenseItem"]] = relationship(
        back_populates="expense", cascade="all, delete-orphan", order_by="ExpenseItem.id"
    )
