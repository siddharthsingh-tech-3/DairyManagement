import calendar
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import Date as SqlDate
from sqlalchemy import cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.billing import Invoice, Payment
from app.models.delivery import Delivery
from app.models.enums import (
    DeliveryStatus,
    DisputeStatus,
    InvoiceStatus,
    LedgerEntryCategory,
    LoanRecordStatus,
    LoanType,
    OrderStatus,
    OrderType,
    PaymentMethod,
    PaymentStatus,
    PurchaseInvoiceStatus,
    SalesInvoiceStatus,
)
from app.models.loan import Loan, LoanRepayment
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.purchase import PaymentOut, PurchaseInvoice
from app.models.sale import PaymentIn, SalesInvoice
from app.repositories.crate_repository import CrateRepository
from app.repositories.expense_repository import ExpenseRepository
from app.repositories.ledger_entry_repository import LedgerEntryRepository
from app.repositories.vendor_repository import VendorRepository
from app.services.audit_service import AuditService


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.vendors = VendorRepository(db)
        self.crates = CrateRepository(db)
        self.expenses = ExpenseRepository(db)
        self.ledger_entries = LedgerEntryRepository(db)
        self.audit = AuditService(db)

    async def get_admin_dashboard(self) -> dict:
        today = date.today()
        qty_result = await self.db.execute(
            select(func.coalesce(func.sum(OrderItem.quantity), 0))
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.delivery_date == today)
        )
        todays_demand_qty = qty_result.scalar_one()

        in_transit_result = await self.db.execute(
            select(func.count()).select_from(Delivery).where(Delivery.status == DeliveryStatus.DISPATCHED)
        )
        trucks_in_transit = in_transit_result.scalar_one()

        # Scoped to customers (is_supplier=False): these figures are receivables/credit
        # exposure to the dairy's delivery customers, not payables to suppliers, which
        # carry the opposite balance convention (see PurchaseService/VendorService.post_ledger_entry).
        vendors = await self.vendors.search(None, is_supplier=False)
        crates_with_vendors = sum(v.crates_with_vendor for v in vendors)
        outstanding_total = sum((v.outstanding_balance for v in vendors), Decimal("0"))
        vendors_over_limit = sum(1 for v in vendors if v.is_over_credit_limit)

        disputes = await self.crates.list_disputes(DisputeStatus.OPEN)

        draft_result = await self.db.execute(
            select(func.count()).select_from(Order).where(Order.status == OrderStatus.DRAFT)
        )
        draft_orders = draft_result.scalar_one()

        return {
            "todays_demand_qty": todays_demand_qty,
            "trucks_in_transit": trucks_in_transit,
            "crates_with_vendors": crates_with_vendors,
            "outstanding_total": outstanding_total,
            "vendors_over_limit": vendors_over_limit,
            "open_disputes": len(disputes),
            "draft_orders": draft_orders,
        }

    async def get_vendor_dashboard(self, vendor_id: uuid.UUID) -> dict:
        vendor = await self.vendors.get_by_id(vendor_id)
        if vendor is None:
            return {
                "next_delivery_date": None,
                "next_delivery_summary": None,
                "outstanding": Decimal("0"),
                "credit_available": Decimal("0"),
                "crates_with_vendor": 0,
                "account_status": "Unknown",
            }

        today = date.today()
        next_order_result = await self.db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(
                Order.vendor_id == vendor_id,
                Order.delivery_date >= today,
                Order.status.in_([OrderStatus.SCHEDULED, OrderStatus.LOCKED, OrderStatus.DISPATCHED]),
            )
            .order_by(Order.delivery_date.asc())
            .limit(1)
        )
        next_order = next_order_result.scalar_one_or_none()

        return {
            "next_delivery_date": next_order.delivery_date if next_order else None,
            "next_delivery_summary": (
                f"{next_order.total_quantity} pkt" if next_order else None
            ),
            "outstanding": vendor.outstanding_balance,
            "credit_available": max(Decimal("0"), vendor.credit_limit - vendor.outstanding_balance),
            "crates_with_vendor": vendor.crates_with_vendor,
            "account_status": "Over limit" if vendor.is_over_credit_limit else (
                "Outstanding" if vendor.outstanding_balance > 0 else "Paid"
            ),
        }

    async def get_driver_dashboard(self, driver_id: uuid.UUID) -> dict:
        today = date.today()
        result = await self.db.execute(
            select(Delivery, Order)
            .join(Order, Order.id == Delivery.order_id)
            .options(selectinload(Order.items))
            .where(Delivery.driver_id == driver_id, Order.delivery_date == today)
        )
        rows = result.all()
        packets_loaded = sum(o.total_quantity for _, o in rows)
        crates_issued = sum(d.crates_out for d, _ in rows)
        return {"stops_today": len(rows), "packets_loaded": packets_loaded, "crates_issued": crates_issued}

    async def get_profit_loss(self, period_month: date) -> dict:
        period_start = period_month.replace(day=1)
        last_day = calendar.monthrange(period_start.year, period_start.month)[1]
        period_end = period_start.replace(day=last_day)

        revenue_result = await self.db.execute(
            select(func.coalesce(func.sum(Invoice.subtotal), 0)).where(
                Invoice.period_month == period_start
            )
        )
        revenue = Decimal(revenue_result.scalar_one())

        expenses = await self.expenses.list_between(period_start, period_end)
        by_category: dict[str, Decimal] = {}
        for expense in expenses:
            by_category[expense.category] = by_category.get(expense.category, Decimal("0")) + expense.amount
        total_expenses = sum(by_category.values(), Decimal("0"))

        return {
            "period_month": period_start,
            "revenue": revenue,
            "expenses_by_category": by_category,
            "total_expenses": total_expenses,
            "net_profit": revenue - total_expenses,
        }

    async def get_operational_report(self) -> dict:
        total_orders_result = await self.db.execute(
            select(func.count()).select_from(Order).where(Order.status != OrderStatus.CANCELLED)
        )
        total_orders = total_orders_result.scalar_one()
        delivered_result = await self.db.execute(
            select(func.count())
            .select_from(Order)
            .where(Order.status.in_([OrderStatus.DELIVERED, OrderStatus.CONFIRMED]))
        )
        delivered = delivered_result.scalar_one()
        fulfilment = Decimal(delivered) / Decimal(total_orders) * 100 if total_orders else Decimal("0")

        txns = await self.crates.list_all_transactions()
        issued = sum(t.quantity for t in txns if t.txn_type.value == "issue")
        returned = sum(t.quantity for t in txns if t.txn_type.value == "return")
        return_rate = Decimal(returned) / Decimal(issued) * 100 if issued else Decimal("0")

        vendors = await self.vendors.search(None, is_supplier=False)
        total_credit = sum((v.credit_limit for v in vendors), Decimal("0"))
        outstanding = sum((v.outstanding_balance for v in vendors), Decimal("0"))
        collected = total_credit - outstanding
        collection_efficiency = collected / total_credit * 100 if total_credit else Decimal("0")

        return {
            "delivery_fulfilment_percent": fulfilment.quantize(Decimal("0.1")),
            "crate_return_rate_percent": return_rate.quantize(Decimal("0.1")),
            "collection_efficiency_percent": collection_efficiency.quantize(Decimal("0.1")),
        }

    async def get_financial_summary(self) -> dict:
        to_collect_result = await self.db.execute(
            select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).where(
                Invoice.status.in_([InvoiceStatus.DUE, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE])
            )
        )
        to_collect = Decimal(to_collect_result.scalar_one())

        all_expenses = await self.expenses.list_all()
        to_pay = sum((e.amount for e in all_expenses if not e.is_paid), Decimal("0"))
        total_expenses = sum((e.amount for e in all_expenses), Decimal("0"))
        paid_expenses_total = sum((e.amount for e in all_expenses if e.is_paid), Decimal("0"))

        revenue_result = await self.db.execute(select(func.coalesce(func.sum(Invoice.total), 0)))
        total_revenue = Decimal(revenue_result.scalar_one())

        payments_result = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.COMPLETED)
        )
        total_collected = Decimal(payments_result.scalar_one())

        invoice_count_result = await self.db.execute(select(func.count()).select_from(Invoice))
        invoice_count = invoice_count_result.scalar_one()

        return {
            "to_collect": to_collect,
            "to_pay": to_pay,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "total_profit": total_revenue - total_expenses,
            "cash_and_bank": total_collected - paid_expenses_total,
            "invoice_count": invoice_count,
        }

    async def get_sales_trend(self, start: date, end: date) -> dict:
        result = await self.db.execute(
            select(
                Order.delivery_date,
                func.sum(
                    OrderItem.rate_snapshot
                    * OrderItem.quantity
                    * (1 + OrderItem.gst_percent_snapshot / 100)
                ),
            )
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(
                Order.delivery_date >= start,
                Order.delivery_date <= end,
                Order.status.in_([OrderStatus.DELIVERED, OrderStatus.CONFIRMED]),
            )
            .group_by(Order.delivery_date)
            .order_by(Order.delivery_date)
        )
        points = [{"date": d, "amount": Decimal(amount)} for d, amount in result.all()]

        invoices_result = await self.db.execute(
            select(func.count())
            .select_from(Invoice)
            .where(cast(Invoice.created_at, SqlDate) >= start, cast(Invoice.created_at, SqlDate) <= end)
        )
        invoices_made = invoices_result.scalar_one()

        return {"points": points, "invoices_made": invoices_made}

    async def get_latest_transactions(self, limit: int = 10) -> list[dict]:
        invoices_result = await self.db.execute(
            select(Invoice).order_by(Invoice.created_at.desc()).limit(limit)
        )
        invoices = list(invoices_result.scalars().all())
        expenses = await self.expenses.list_recent(limit)

        txns: list[dict] = []
        for inv in invoices:
            vendor = await self.vendors.get_by_id(inv.vendor_id)
            txns.append(
                {
                    "id": inv.id,
                    "date": inv.created_at.date(),
                    "type": "Sale Invoice",
                    "txn_no": inv.invoice_no,
                    "party_name": vendor.name if vendor else "Unknown vendor",
                    "amount": inv.total,
                }
            )
        for exp in expenses:
            txns.append(
                {
                    "id": exp.id,
                    "date": exp.expense_date,
                    "type": "Expense" if exp.is_paid else "Purchase (unpaid)",
                    "txn_no": f"EXP-{str(exp.id)[:8].upper()}",
                    "party_name": exp.payee or exp.category,
                    "amount": exp.amount,
                }
            )

        txns.sort(key=lambda t: t["date"], reverse=True)
        return txns[:limit]

    async def get_todays_demand(self) -> list[dict]:
        today = date.today()
        result = await self.db.execute(
            select(Order, OrderItem, Product)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(Product, Product.id == OrderItem.product_id)
            .where(
                Order.status != OrderStatus.CANCELLED,
                or_(Order.delivery_date == today, Order.order_type == OrderType.RECURRING),
            )
            .order_by(Order.created_at.desc())
        )
        rows = result.all()

        demand: list[dict] = []
        for order, item, product in rows:
            vendor_name = order.walkin_customer_name or "Walk-in customer"
            if order.vendor_id is not None:
                vendor = await self.vendors.get_by_id(order.vendor_id)
                vendor_name = vendor.name if vendor else "Unknown vendor"
            demand.append(
                {
                    "vendor_name": vendor_name,
                    "product_name": product.name,
                    "quantity": item.quantity,
                    "order_type": order.order_type.value,
                }
            )
        return demand

    async def get_balance_sheet(self) -> dict:
        capital = await self.ledger_entries.sum_by_category(LedgerEntryCategory.CAPITAL)
        loans = await self.ledger_entries.sum_by_category(LedgerEntryCategory.LOANS)
        fixed_assets = await self.ledger_entries.sum_by_category(LedgerEntryCategory.FIXED_ASSETS)
        investments = await self.ledger_entries.sum_by_category(LedgerEntryCategory.INVESTMENTS)
        loans_advance = await self.ledger_entries.sum_by_category(LedgerEntryCategory.LOANS_ADVANCE)

        loans_taken_result = await self.db.execute(
            select(func.coalesce(func.sum(Loan.outstanding_principal + Loan.outstanding_interest), 0)).where(
                Loan.loan_type == LoanType.TAKEN, Loan.status != LoanRecordStatus.CANCELLED
            )
        )
        loans += Decimal(loans_taken_result.scalar_one())

        loans_given_result = await self.db.execute(
            select(func.coalesce(func.sum(Loan.outstanding_principal + Loan.outstanding_interest), 0)).where(
                Loan.loan_type == LoanType.GIVEN, Loan.status != LoanRecordStatus.CANCELLED
            )
        )
        loans_advance += Decimal(loans_given_result.scalar_one())

        invoice_receivable_result = await self.db.execute(
            select(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).where(
                Invoice.status.in_([InvoiceStatus.DUE, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE])
            )
        )
        sales_invoice_receivable_result = await self.db.execute(
            select(func.coalesce(func.sum(SalesInvoice.total_amount - SalesInvoice.amount_paid), 0)).where(
                SalesInvoice.status.in_([SalesInvoiceStatus.UNPAID, SalesInvoiceStatus.PARTIAL])
            )
        )
        accounts_receivable = Decimal(invoice_receivable_result.scalar_one()) + Decimal(
            sales_invoice_receivable_result.scalar_one()
        )

        account_payable_result = await self.db.execute(
            select(func.coalesce(func.sum(PurchaseInvoice.total_amount - PurchaseInvoice.amount_paid), 0)).where(
                PurchaseInvoice.status.in_([PurchaseInvoiceStatus.UNPAID, PurchaseInvoiceStatus.PARTIAL])
            )
        )
        account_payable = Decimal(account_payable_result.scalar_one())

        tcs_payable_result = await self.db.execute(select(func.coalesce(func.sum(SalesInvoice.tcs_amount), 0)))
        tcs_payable = Decimal(tcs_payable_result.scalar_one())

        tds_payable_result = await self.db.execute(select(func.coalesce(func.sum(PurchaseInvoice.tds_amount), 0)))
        tds_payable = Decimal(tds_payable_result.scalar_one())

        tcs_receivable_result = await self.db.execute(select(func.coalesce(func.sum(PurchaseInvoice.tcs_amount), 0)))
        tcs_receivable = Decimal(tcs_receivable_result.scalar_one())

        tds_receivable_result = await self.db.execute(select(func.coalesce(func.sum(SalesInvoice.tds_amount), 0)))
        tds_receivable = Decimal(tds_receivable_result.scalar_one())

        cash_methods = [PaymentMethod.CASH, PaymentMethod.COD]
        bank_methods = [PaymentMethod.BANK, PaymentMethod.UPI]

        cash_in_result = await self.db.execute(
            select(func.coalesce(func.sum(PaymentIn.amount), 0)).where(PaymentIn.method.in_(cash_methods))
        )
        legacy_cash_in_result = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.method.in_(cash_methods), Payment.status == PaymentStatus.COMPLETED
            )
        )
        cash_out_result = await self.db.execute(
            select(func.coalesce(func.sum(PaymentOut.amount), 0)).where(PaymentOut.method == PaymentMethod.CASH)
        )
        cash_in_hand = (
            Decimal(cash_in_result.scalar_one())
            + Decimal(legacy_cash_in_result.scalar_one())
            - Decimal(cash_out_result.scalar_one())
        )

        bank_in_result = await self.db.execute(
            select(func.coalesce(func.sum(PaymentIn.amount), 0)).where(PaymentIn.method.in_(bank_methods))
        )
        legacy_bank_in_result = await self.db.execute(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.method.in_(bank_methods), Payment.status == PaymentStatus.COMPLETED
            )
        )
        bank_out_result = await self.db.execute(
            select(func.coalesce(func.sum(PaymentOut.amount), 0)).where(PaymentOut.method.in_(bank_methods))
        )
        cash_in_bank = (
            Decimal(bank_in_result.scalar_one())
            + Decimal(legacy_bank_in_result.scalar_one())
            - Decimal(bank_out_result.scalar_one())
        )

        # Loan cash movement: disbursement of a loan taken brings cash in, disbursing a
        # loan given sends cash out; a repayment does the opposite of its loan's direction.
        # tax_amount on a repayment is withheld, never physically transferred, so it's excluded.
        loan_cash_in_result = await self.db.execute(
            select(func.coalesce(func.sum(Loan.principal_amount), 0)).where(
                Loan.loan_type == LoanType.TAKEN, Loan.disbursement_method.in_(cash_methods)
            )
        )
        loan_cash_out_result = await self.db.execute(
            select(func.coalesce(func.sum(Loan.principal_amount), 0)).where(
                Loan.loan_type == LoanType.GIVEN, Loan.disbursement_method.in_(cash_methods)
            )
        )
        loan_repayment_cash_collected_result = await self.db.execute(
            select(func.coalesce(func.sum(LoanRepayment.principal_amount + LoanRepayment.interest_amount), 0))
            .join(Loan, Loan.id == LoanRepayment.loan_id)
            .where(Loan.loan_type == LoanType.GIVEN, LoanRepayment.method.in_(cash_methods))
        )
        loan_repayment_cash_paid_result = await self.db.execute(
            select(func.coalesce(func.sum(LoanRepayment.principal_amount + LoanRepayment.interest_amount), 0))
            .join(Loan, Loan.id == LoanRepayment.loan_id)
            .where(Loan.loan_type == LoanType.TAKEN, LoanRepayment.method.in_(cash_methods))
        )
        cash_in_hand = (
            cash_in_hand
            + Decimal(loan_cash_in_result.scalar_one())
            - Decimal(loan_cash_out_result.scalar_one())
            + Decimal(loan_repayment_cash_collected_result.scalar_one())
            - Decimal(loan_repayment_cash_paid_result.scalar_one())
        )

        loan_bank_in_result = await self.db.execute(
            select(func.coalesce(func.sum(Loan.principal_amount), 0)).where(
                Loan.loan_type == LoanType.TAKEN, Loan.disbursement_method.in_(bank_methods)
            )
        )
        loan_bank_out_result = await self.db.execute(
            select(func.coalesce(func.sum(Loan.principal_amount), 0)).where(
                Loan.loan_type == LoanType.GIVEN, Loan.disbursement_method.in_(bank_methods)
            )
        )
        loan_repayment_bank_collected_result = await self.db.execute(
            select(func.coalesce(func.sum(LoanRepayment.principal_amount + LoanRepayment.interest_amount), 0))
            .join(Loan, Loan.id == LoanRepayment.loan_id)
            .where(Loan.loan_type == LoanType.GIVEN, LoanRepayment.method.in_(bank_methods))
        )
        loan_repayment_bank_paid_result = await self.db.execute(
            select(func.coalesce(func.sum(LoanRepayment.principal_amount + LoanRepayment.interest_amount), 0))
            .join(Loan, Loan.id == LoanRepayment.loan_id)
            .where(Loan.loan_type == LoanType.TAKEN, LoanRepayment.method.in_(bank_methods))
        )
        cash_in_bank = (
            cash_in_bank
            + Decimal(loan_bank_in_result.scalar_one())
            - Decimal(loan_bank_out_result.scalar_one())
            + Decimal(loan_repayment_bank_collected_result.scalar_one())
            - Decimal(loan_repayment_bank_paid_result.scalar_one())
        )

        inventory_result = await self.db.execute(
            select(
                func.coalesce(
                    func.sum(Product.current_stock * func.coalesce(Product.purchase_price, Product.rate)), 0
                )
            )
        )
        inventory_in_hand = Decimal(inventory_result.scalar_one())

        sales_invoice_revenue_result = await self.db.execute(
            select(func.coalesce(func.sum(SalesInvoice.total_amount), 0)).where(
                SalesInvoice.status != SalesInvoiceStatus.CANCELLED
            )
        )
        invoice_revenue_result = await self.db.execute(select(func.coalesce(func.sum(Invoice.total), 0)))
        all_expenses = await self.expenses.list_all()
        total_expenses = sum((e.amount for e in all_expenses), Decimal("0"))
        net_income = (
            Decimal(invoice_revenue_result.scalar_one())
            + Decimal(sales_invoice_revenue_result.scalar_one())
            - total_expenses
        )

        tax_payable_total = tcs_payable + tds_payable
        current_liability_total = tax_payable_total + account_payable
        total_liabilities = capital + current_liability_total + loans + net_income

        tax_receivable_total = tcs_receivable + tds_receivable
        current_assets_total = (
            tax_receivable_total + cash_in_hand + cash_in_bank + accounts_receivable + inventory_in_hand
        )
        total_assets = current_assets_total + fixed_assets + investments + loans_advance

        return {
            "capital": capital,
            "current_liability": {
                "tax_payable": {
                    "tcs_payable": tcs_payable,
                    "tds_payable": tds_payable,
                    "total": tax_payable_total,
                },
                "account_payable": account_payable,
                "total": current_liability_total,
            },
            "loans": loans,
            "net_income": net_income,
            "total_liabilities": total_liabilities,
            "current_assets": {
                "tax_receivable": {
                    "tcs_receivable": tcs_receivable,
                    "tds_receivable": tds_receivable,
                    "total": tax_receivable_total,
                },
                "cash_in_hand": cash_in_hand,
                "cash_in_bank": cash_in_bank,
                "accounts_receivable": accounts_receivable,
                "inventory_in_hand": inventory_in_hand,
                "total": current_assets_total,
            },
            "fixed_assets": fixed_assets,
            "investments": investments,
            "loans_advance": loans_advance,
            "total_assets": total_assets,
            "generated_at": datetime.utcnow(),
        }
