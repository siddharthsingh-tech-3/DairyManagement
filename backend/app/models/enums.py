from enum import StrEnum


class UserRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    VENDOR = "vendor"
    DRIVER = "driver"


class PermissionLevel(StrEnum):
    FULL = "full"
    VIEW = "view"
    NONE = "none"


class PermissionFeature(StrEnum):
    ORDERS = "orders"
    DELIVERY = "delivery"
    CRATES = "crates"
    PRODUCTS = "products"
    VENDORS = "vendors"
    BILLING = "billing"
    PAYMENTS = "payments"
    USER_ACCESS = "user_access"
    REPORTS = "reports"
    PURCHASES = "purchases"
    SALES = "sales"
    EXPENSES = "expenses"
    BUSINESS_PARTNERS = "business_partners"
    TRANSPORT = "transport"
    LOANS = "loans"


class OrderType(StrEnum):
    NORMAL = "normal"
    SCHEDULED = "scheduled"
    RECURRING = "recurring"


class OrderStatus(StrEnum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    LOCKED = "locked"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class PaymentMethod(StrEnum):
    UPI = "upi"
    COD = "cod"
    PAY_LATER = "pay_later"
    CASH = "cash"
    BANK = "bank"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class DeliveryStatus(StrEnum):
    PENDING = "pending"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CONFIRMED = "confirmed"


class DeliveryZone(StrEnum):
    ZONE_1 = "zone_1"
    ZONE_2 = "zone_2"


class ExtraItemRequestedBy(StrEnum):
    VENDOR = "vendor"
    DRIVER = "driver"


class CrateTxnType(StrEnum):
    ISSUE = "issue"
    RETURN = "return"
    DAMAGE = "damage"
    ADJUSTMENT = "adjustment"


class DisputeStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"


class StockMovementType(StrEnum):
    PURCHASE = "purchase"
    CONSUMPTION = "consumption"
    ADJUSTMENT = "adjustment"
    SALE_DISPATCH = "sale_dispatch"


class OfferDiscountType(StrEnum):
    PERCENT = "percent"
    FLAT = "flat"


class InvoiceStatus(StrEnum):
    DUE = "due"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"


class LedgerEntryType(StrEnum):
    INVOICE = "invoice"
    PAYMENT = "payment"
    ADJUSTMENT = "adjustment"
    OPENING_BALANCE = "opening_balance"
    PURCHASE_INVOICE = "purchase_invoice"
    PAYMENT_OUT = "payment_out"
    PURCHASE_RETURN = "purchase_return"
    DEBIT_NOTE = "debit_note"
    SALES_INVOICE = "sales_invoice"
    PAYMENT_IN = "payment_in"
    SALES_RETURN = "sales_return"
    CREDIT_NOTE = "credit_note"


class LedgerEntryCategory(StrEnum):
    CAPITAL = "capital"
    LOANS = "loans"
    FIXED_ASSETS = "fixed_assets"
    INVESTMENTS = "investments"
    LOANS_ADVANCE = "loans_advance"


class PurchaseOrderStatus(StrEnum):
    DRAFT = "draft"
    ORDERED = "ordered"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class PurchaseInvoiceStatus(StrEnum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"


class PurchaseReturnStatus(StrEnum):
    DRAFT = "draft"
    COMPLETED = "completed"


class DebitNoteStatus(StrEnum):
    DRAFT = "draft"
    COMPLETED = "completed"


class QuotationStatus(StrEnum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class SalesInvoiceStatus(StrEnum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"
    CANCELLED = "cancelled"


class SalesReturnStatus(StrEnum):
    DRAFT = "draft"
    COMPLETED = "completed"


class CreditNoteStatus(StrEnum):
    DRAFT = "draft"
    COMPLETED = "completed"


class DeliveryChallanStatus(StrEnum):
    DRAFT = "draft"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    INVOICED = "invoiced"
    CANCELLED = "cancelled"


class ProformaInvoiceStatus(StrEnum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


class PartnerStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class CapitalContributionType(StrEnum):
    INITIAL = "initial"
    ADDITIONAL = "additional"


class RemunerationType(StrEnum):
    SALARY = "salary"
    COMMISSION = "commission"
    BONUS = "bonus"
    OTHER = "other"


class RemunerationFrequency(StrEnum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    ONE_TIME = "one_time"


class InterestCalculationMethod(StrEnum):
    SIMPLE = "simple"
    COMPOUND = "compound"


class InterestPaymentStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"


class LoanStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"
    DEFAULTED = "defaulted"


class LiabilityStatus(StrEnum):
    PENDING = "pending"
    PARTIAL = "partial"
    SETTLED = "settled"
    OVERDUE = "overdue"


class TransportOwnership(StrEnum):
    OWN = "own"
    RENT = "rent"


class LoanType(StrEnum):
    TAKEN = "taken"
    GIVEN = "given"


class LoanPartyType(StrEnum):
    VENDOR = "vendor"
    BUSINESS_PARTNER = "business_partner"
    OTHER = "other"


class RepaymentFrequency(StrEnum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALF_YEARLY = "half_yearly"
    YEARLY = "yearly"


class InstallmentStatus(StrEnum):
    UPCOMING = "upcoming"
    DUE = "due"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"


class LoanRecordStatus(StrEnum):
    ACTIVE = "active"
    CLOSED = "closed"
    DEFAULTED = "defaulted"
    CANCELLED = "cancelled"


class LoanLedgerEntryType(StrEnum):
    DISBURSEMENT = "disbursement"
    PRINCIPAL_REPAYMENT = "principal_repayment"
    INTEREST_REPAYMENT = "interest_repayment"
    TAX_DEDUCTION = "tax_deduction"
    ADJUSTMENT = "adjustment"
    CANCELLATION = "cancellation"
