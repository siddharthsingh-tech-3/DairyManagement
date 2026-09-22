export type UserRole = 'super_admin' | 'vendor' | 'driver'

export type PermissionLevel = 'full' | 'view' | 'none'

export type PermissionFeature =
  | 'orders'
  | 'delivery'
  | 'crates'
  | 'products'
  | 'vendors'
  | 'billing'
  | 'payments'
  | 'user_access'
  | 'reports'
  | 'purchases'
  | 'sales'
  | 'expenses'
  | 'e_invoicing'
  | 'business_partners'
  | 'transport'
  | 'loans'

export type OrderType = 'normal' | 'scheduled' | 'recurring'

export type OrderStatus =
  | 'draft'
  | 'scheduled'
  | 'locked'
  | 'dispatched'
  | 'delivered'
  | 'confirmed'
  | 'cancelled'

export type PaymentMethod = 'upi' | 'cod' | 'pay_later' | 'cash' | 'bank'

export type PaymentStatus = 'pending' | 'completed' | 'failed'

export type DeliveryStatus = 'pending' | 'dispatched' | 'delivered' | 'confirmed'

export type ExtraItemRequestedBy = 'vendor' | 'driver'

export type CrateTxnType = 'issue' | 'return' | 'damage' | 'adjustment'

export type DisputeStatus = 'open' | 'resolved'

export type StockMovementType = 'purchase' | 'consumption' | 'adjustment' | 'sale_dispatch'

export type InvoiceStatus = 'due' | 'partial' | 'paid' | 'overdue'

export type LedgerEntryCategory = 'capital' | 'loans' | 'fixed_assets' | 'investments' | 'loans_advance'

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled'

export type PurchaseInvoiceStatus = 'unpaid' | 'partial' | 'paid'

export type PurchaseReturnStatus = 'draft' | 'completed'

export type DebitNoteStatus = 'draft' | 'completed'

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export type SalesInvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled'

export type SalesReturnStatus = 'draft' | 'completed'

export type CreditNoteStatus = 'draft' | 'completed'

export type DeliveryChallanStatus = 'draft' | 'dispatched' | 'delivered' | 'invoiced' | 'cancelled'

export type ProformaInvoiceStatus = 'draft' | 'sent' | 'accepted' | 'expired'

export type PartnerStatus = 'active' | 'inactive'

export type CapitalContributionType = 'initial' | 'additional'

export type RemunerationType = 'salary' | 'commission' | 'bonus' | 'other'

export type RemunerationFrequency = 'monthly' | 'quarterly' | 'annually' | 'one_time'

export type InterestCalculationMethod = 'simple' | 'compound'

export type InterestPaymentStatus = 'pending' | 'paid'

export type LoanStatus = 'active' | 'closed' | 'defaulted'

export type LiabilityStatus = 'pending' | 'partial' | 'settled' | 'overdue'

export type TransportOwnership = 'own' | 'rent'

export type LoanType = 'taken' | 'given'

export type LoanPartyType = 'vendor' | 'business_partner' | 'other'

export type RepaymentFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'

export type InstallmentStatus = 'upcoming' | 'due' | 'partially_paid' | 'paid' | 'overdue'

export type LoanRecordStatus = 'active' | 'closed' | 'defaulted' | 'cancelled'

export type LoanLedgerEntryType =
  | 'disbursement'
  | 'principal_repayment'
  | 'interest_repayment'
  | 'tax_deduction'
  | 'adjustment'
  | 'cancellation'
