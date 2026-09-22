import type {
  CapitalContributionType,
  CreditNoteStatus,
  CrateTxnType,
  DebitNoteStatus,
  DeliveryChallanStatus,
  DeliveryStatus,
  DisputeStatus,
  ExtraItemRequestedBy,
  InterestCalculationMethod,
  InterestPaymentStatus,
  InvoiceStatus,
  LedgerEntryCategory,
  LiabilityStatus,
  LoanLedgerEntryType,
  LoanPartyType,
  LoanRecordStatus,
  LoanStatus,
  LoanType,
  InstallmentStatus,
  OrderStatus,
  OrderType,
  PartnerStatus,
  PaymentMethod,
  PaymentStatus,
  PermissionFeature,
  PermissionLevel,
  ProformaInvoiceStatus,
  PurchaseInvoiceStatus,
  PurchaseOrderStatus,
  PurchaseReturnStatus,
  QuotationStatus,
  RemunerationFrequency,
  RemunerationType,
  RepaymentFrequency,
  SalesInvoiceStatus,
  SalesReturnStatus,
  TransportOwnership,
  UserRole,
} from './enums'

export interface User {
  id: string
  email: string
  phone: string | null
  full_name: string
  role: UserRole
  vendor_id: string | null
  driver_id: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  tenant_name?: string | null
  is_platform_admin?: boolean
}

export interface Tenant {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
}

export interface PermissionEntry {
  feature: PermissionFeature | string
  role: UserRole
  level: PermissionLevel
}

export interface Vendor {
  id: string
  code: string
  name: string
  category: string | null
  contact_name: string
  phone: string
  email: string | null
  area: string
  route: string
  gstin: string | null
  pan_number: string | null
  billing_street: string | null
  billing_city: string | null
  billing_state: string | null
  billing_pincode: string | null
  shipping_street: string | null
  shipping_city: string | null
  shipping_state: string | null
  shipping_pincode: string | null
  credit_period_days: number
  credit_limit: string
  outstanding_balance: string
  crates_with_vendor: number
  vendor_since: string
  is_active: boolean
  is_over_credit_limit: boolean
  is_supplier: boolean
}

export interface VendorBankAccount {
  id: string
  account_holder_name: string
  account_number: string
  ifsc_code: string
  bank_name: string
  is_primary: boolean
}

export interface VendorCustomField {
  id: string
  field_name: string
  field_value: string
}

export interface LedgerEntry {
  id: string
  entry_type: string
  description: string
  debit: string
  credit: string
  reference_number: string | null
  status: string | null
  tds_deducted_by_party: string
  tds_deducted_by_self: string
  created_at: string
}

export interface VendorDetail extends Vendor {
  ledger: LedgerEntry[]
  bank_accounts: VendorBankAccount[]
  custom_fields: VendorCustomField[]
}

export type ItemType = 'product' | 'service'

export interface Product {
  id: string
  sku: string
  name: string
  item_type: ItemType
  category: string | null
  hsn_code: string
  rate: string
  purchase_price: string | null
  sales_price_includes_tax: boolean
  purchase_price_includes_tax: boolean
  gst_percent: string
  discount_percent: string | null
  unit: string
  alternative_unit: string | null
  current_stock: number
  opening_stock_date: string | null
  reorder_level: number
  low_stock_alert_enabled: boolean
  show_in_online_store: boolean
  batch_no: string | null
  expiry_date: string | null
  description: string | null
  is_active: boolean
  is_low_stock: boolean
}

export interface Category {
  id: string
  name: string
  item_count: number
}

export type OfferDiscountType = 'percent' | 'flat'

export interface Offer {
  id: string
  title: string
  description: string | null
  discount_type: OfferDiscountType
  discount_value: string
  valid_from: string
  valid_till: string | null
  applies_to_all: boolean
  is_active: boolean
  is_running: boolean
  product_ids: string[]
  created_at: string
}

export interface OrderItem {
  id: string
  product_id: string
  quantity: number
  rate_snapshot: string
  gst_percent_snapshot: string
  crates_qty: number
  line_total: string
}

export interface Order {
  id: string
  order_no: string
  vendor_id: string | null
  vendor_name: string | null
  walkin_customer_name: string | null
  is_walkin: boolean
  order_type: OrderType
  recurrence_frequency: string | null
  delivery_date: string | null
  status: OrderStatus
  payment_method: PaymentMethod | null
  total_crates: number
  needs_approval: boolean
  items: OrderItem[]
  total_quantity: number
  total_amount: string
  is_editable: boolean
  created_at: string
}

export interface DeliveryExtraItem {
  id: string
  product_id: string
  quantity: number
  requested_by: ExtraItemRequestedBy
}

export interface DeliveryOrderItem {
  product_id: string
  product_name: string
  quantity: number
  crates_qty: number
}

export type DeliveryZone = 'zone_1' | 'zone_2'

export interface Delivery {
  id: string
  order_id: string
  order_no: string
  vendor_name: string | null
  driver_id: string | null
  driver_name: string | null
  zone: DeliveryZone | null
  truck_number: string | null
  status: DeliveryStatus
  delivered_quantity: number | null
  crates_out: number
  crates_in: number
  items: DeliveryOrderItem[]
  extra_items: DeliveryExtraItem[]
  delivered_at: string | null
  confirmed_at: string | null
}

export interface CrateSummaryRow {
  vendor_id: string
  vendor_name: string
  given: number
  returned: number
  balance: number
  broken: number
}

export interface CrateTransaction {
  id: string
  vendor_id: string
  vendor_name: string
  txn_type: CrateTxnType
  quantity: number
  note: string | null
  created_at: string
}

export interface CrateDispute {
  id: string
  vendor_id: string
  vendor_name: string
  driver_reported_qty: number
  vendor_confirmed_qty: number
  status: DisputeStatus
  resolution_note: string | null
  created_at: string
}

export interface InvoiceItem {
  id: string
  description: string
  hsn_code: string
  rate: string
  quantity: number
  amount: string
}

export interface Invoice {
  id: string
  invoice_no: string
  vendor_id: string
  vendor_name: string
  period_month: string
  subtotal: string
  cgst: string
  sgst: string
  total: string
  amount_paid: string
  status: InvoiceStatus
  due_date: string
  created_at: string
  created_by: string | null
  invoice_type: string
  items: InvoiceItem[]
}

export interface Payment {
  id: string
  vendor_id: string
  invoice_id: string | null
  order_id: string | null
  amount: string
  tds_amount: string
  method: PaymentMethod
  status: PaymentStatus
  reference: string | null
  created_at: string
}

export interface ExpenseItem {
  id: string
  description: string
  amount: string
  tax_percent: string
}

export interface Expense {
  id: string
  expense_number: string | null
  category: string
  amount: string
  expense_date: string
  payee: string | null
  payment_mode: string | null
  original_invoice_number: string | null
  is_gst_applicable: boolean
  is_paid: boolean
  note: string | null
  attachment_url: string | null
  items: ExpenseItem[]
  created_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  item_count: number
}

export interface ManualLedgerEntry {
  id: string
  category: LedgerEntryCategory
  label: string
  amount: string
  entry_date: string
  note: string | null
  created_at: string
}

export interface BalanceSheetTaxBucket {
  tcs_payable?: string
  tds_payable?: string
  tcs_receivable?: string
  tds_receivable?: string
  total: string
}

export interface BalanceSheetCurrentLiability {
  tax_payable: BalanceSheetTaxBucket
  account_payable: string
  total: string
}

export interface BalanceSheetCurrentAssets {
  tax_receivable: BalanceSheetTaxBucket
  cash_in_hand: string
  cash_in_bank: string
  accounts_receivable: string
  inventory_in_hand: string
  total: string
}

export interface BalanceSheet {
  capital: string
  current_liability: BalanceSheetCurrentLiability
  loans: string
  net_income: string
  total_liabilities: string
  current_assets: BalanceSheetCurrentAssets
  fixed_assets: string
  investments: string
  loans_advance: string
  total_assets: string
  generated_at: string
}

export interface FinancialSummary {
  to_collect: string
  to_pay: string
  total_revenue: string
  total_expenses: string
  total_profit: string
  cash_and_bank: string
  invoice_count: number
}

export interface SalesTrendPoint {
  date: string
  amount: string
}

export interface SalesTrend {
  points: SalesTrendPoint[]
  invoices_made: number
}

export interface LatestTransaction {
  id: string
  date: string
  type: string
  txn_no: string
  party_name: string
  amount: string
}

export interface TodaysDemandRow {
  vendor_name: string
  product_name: string
  quantity: number
  order_type: string
}

export interface AdminDashboard {
  todays_demand_qty: number
  trucks_in_transit: number
  crates_with_vendors: number
  outstanding_total: string
  vendors_over_limit: number
  open_disputes: number
  draft_orders: number
}

// Shared by Purchase Order and Purchase Invoice line items (has a discount%).
export interface PurchaseItem {
  id: string
  product_id: string | null
  description: string
  hsn_code: string
  quantity: number
  rate: string
  discount_percent: string
  tax_percent: string
  amount: string
}

// Shared by Purchase Return and Debit Note line items (no discount%).
export interface PurchaseAdjustmentItem {
  id: string
  product_id: string | null
  description: string
  hsn_code: string
  quantity: number
  rate: string
  tax_percent: string
  amount: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string
  vendor_name: string
  order_date: string
  valid_till: string | null
  status: PurchaseOrderStatus
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  items: PurchaseItem[]
}

export interface PurchaseInvoice {
  id: string
  invoice_number: string
  vendor_invoice_number: string | null
  vendor_id: string
  vendor_name: string
  purchase_order_id: string | null
  invoice_date: string
  due_date: string | null
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  status: PurchaseInvoiceStatus
  notes: string | null
  created_at: string
  created_by: string | null
  items: PurchaseItem[]
}

export interface PaymentOutAllocation {
  purchase_invoice_id: string
  invoice_number: string
  amount: string
  discount: string
}

export interface PaymentOut {
  id: string
  payment_number: string
  vendor_id: string
  vendor_name: string
  purchase_invoice_id: string | null
  amount: string
  discount_amount: string
  payment_date: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  created_at: string
  allocations: PaymentOutAllocation[]
}

export interface PurchaseReturn {
  id: string
  return_number: string
  vendor_id: string
  vendor_name: string
  purchase_invoice_id: string | null
  return_date: string
  due_in: string | null
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  status: PurchaseReturnStatus
  notes: string | null
  created_at: string
  created_by: string | null
  items: PurchaseAdjustmentItem[]
}

export interface DebitNote {
  id: string
  debit_note_number: string
  vendor_id: string
  vendor_name: string
  purchase_invoice_id: string | null
  purchase_return_id: string | null
  note_date: string
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  status: DebitNoteStatus
  notes: string | null
  created_at: string
  created_by: string | null
  items: PurchaseAdjustmentItem[]
}

// Shared by Quotation, Sales Invoice, Delivery Challan and Proforma Invoice line items (has a discount%).
export interface SalesItem {
  id: string
  product_id: string | null
  description: string
  hsn_code: string
  quantity: number
  rate: string
  discount_percent: string
  tax_percent: string
  amount: string
}

// Shared by Sales Return and Credit Note line items (no discount%).
export interface SalesAdjustmentItem {
  id: string
  product_id: string | null
  description: string
  hsn_code: string
  quantity: number
  rate: string
  tax_percent: string
  amount: string
}

export interface Quotation {
  id: string
  quote_number: string
  vendor_id: string
  vendor_name: string
  quote_date: string
  valid_till: string | null
  status: QuotationStatus
  subtotal: string
  discount_amount: string
  tax_amount: string
  round_off: string
  total_amount: string
  notes: string | null
  created_at: string
  created_by: string | null
  items: SalesItem[]
}

export interface SalesInvoice {
  id: string
  invoice_number: string
  vendor_id: string
  vendor_name: string
  quotation_id: string | null
  invoice_date: string
  due_date: string | null
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  status: SalesInvoiceStatus
  notes: string | null
  created_at: string
  created_by: string | null
  items: SalesItem[]
}

export interface PaymentInAllocation {
  sales_invoice_id: string
  invoice_number: string
  amount: string
  discount: string
}

export interface PaymentIn {
  id: string
  payment_number: string
  vendor_id: string
  vendor_name: string
  sales_invoice_id: string | null
  amount: string
  discount_amount: string
  payment_date: string
  method: PaymentMethod
  reference: string | null
  notes: string | null
  created_at: string
  allocations: PaymentInAllocation[]
}

export interface SalesReturn {
  id: string
  return_number: string
  vendor_id: string
  vendor_name: string
  sales_invoice_id: string | null
  return_date: string
  due_in: string | null
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  status: SalesReturnStatus
  notes: string | null
  created_at: string
  created_by: string | null
  items: SalesAdjustmentItem[]
}

export interface CreditNote {
  id: string
  credit_note_number: string
  vendor_id: string
  vendor_name: string
  sales_invoice_id: string | null
  sales_return_id: string | null
  note_date: string
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  status: CreditNoteStatus
  notes: string | null
  created_at: string
  created_by: string | null
  items: SalesAdjustmentItem[]
}

export interface DeliveryChallan {
  id: string
  challan_number: string
  vendor_id: string
  vendor_name: string
  quotation_id: string | null
  sales_invoice_id: string | null
  challan_date: string
  status: DeliveryChallanStatus
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  items: SalesItem[]
}

export interface ProformaInvoice {
  id: string
  proforma_number: string
  vendor_id: string
  vendor_name: string
  quotation_id: string | null
  proforma_date: string
  valid_till: string | null
  status: ProformaInvoiceStatus
  subtotal: string
  discount_amount: string
  additional_charges: string
  tax_amount: string
  tds_amount: string
  tcs_amount: string
  round_off: string
  total_amount: string
  amount_paid: string
  payment_terms: string | null
  terms_and_conditions: string | null
  authorized_signatory_name: string | null
  authorized_signatory_signature_url: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  items: SalesItem[]
}

export interface VendorDashboard {
  next_delivery_date: string | null
  next_delivery_summary: string | null
  outstanding: string
  credit_available: string
  crates_with_vendor: number
  account_status: string
}

export interface DriverDashboard {
  stops_today: number
  packets_loaded: number
  crates_issued: number
}

export interface ProfitLoss {
  period_month: string
  revenue: string
  expenses_by_category: Record<string, string>
  total_expenses: string
  net_profit: string
}

export interface OperationalReport {
  delivery_fulfilment_percent: string
  crate_return_rate_percent: string
  collection_efficiency_percent: string
}

export interface PartnerBankAccount {
  id: string
  account_number: string
  account_holder_name: string | null
  bank_name: string | null
  ifsc_code: string | null
  branch_name: string | null
  is_primary: boolean
}

export interface PartnerCapitalContribution {
  id: string
  contribution_type: CapitalContributionType
  amount: string
  contribution_date: string
  note: string | null
  interest_rate: string | null
  interest_amount: string | null
  interest_calculation_method: InterestCalculationMethod | null
  interest_effective_date: string | null
}

export interface PartnerProfitLossRatio {
  id: string
  profit_percentage: string
  loss_percentage: string
  effective_date: string
  note: string | null
}

export interface PartnerDrawing {
  id: string
  amount: string
  drawing_date: string
  description: string | null
}

export interface PartnerProfitLossAllocation {
  id: string
  amount: string
  allocation_date: string
  period_label: string | null
  note: string | null
}

export interface PartnerRemuneration {
  id: string
  remuneration_type: RemunerationType
  amount: string
  frequency: RemunerationFrequency
  effective_date: string
  description: string | null
}

export interface PartnerCapitalInterest {
  id: string
  interest_rate: string
  calculation_method: InterestCalculationMethod
  effective_date: string
  interest_amount: string
  payment_status: InterestPaymentStatus
}

export interface PartnerLoan {
  id: string
  loan_amount: string
  loan_date: string
  interest_rate: string | null
  repayment_terms: string | null
  outstanding_balance: string
  loan_status: LoanStatus
}

export interface PartnerJointLiability {
  id: string
  liability_type: string
  description: string | null
  total_liability_amount: string
  share_percentage: string
  outstanding_amount: string
  due_date: string | null
  status: LiabilityStatus
}

export interface PartnerResponsibility {
  id: string
  role_title: string
  description: string | null
  financial_decision_authority: boolean
  approval_authority: boolean
  effective_date: string
  notes: string | null
}

export interface BusinessPartner {
  id: string
  name: string
  address: string
  phone: string | null
  email: string | null
  tin: string | null
  pan_number: string | null
  gstin: string | null
  other_tax_details: string | null
  status: PartnerStatus
  opening_capital_balance: string
  opening_balance_date: string | null

  total_capital_contributed: string
  total_additional_contributed: string
  total_expected_interest: string
  total_drawings: string
  current_capital_balance: string
  current_profit_percentage: string | null
  current_loss_percentage: string | null
  total_outstanding_loans: string
  total_outstanding_liabilities: string
}

export interface BusinessPartnerDetail extends BusinessPartner {
  bank_accounts: PartnerBankAccount[]
  capital_contributions: PartnerCapitalContribution[]
  profit_loss_ratios: PartnerProfitLossRatio[]
  drawings: PartnerDrawing[]
  profit_loss_allocations: PartnerProfitLossAllocation[]
  remunerations: PartnerRemuneration[]
  capital_interest_entries: PartnerCapitalInterest[]
  loans: PartnerLoan[]
  joint_liabilities: PartnerJointLiability[]
  responsibilities: PartnerResponsibility[]
}

export interface TransportZone {
  id: string
  name: string
  bill_count: number
}

export interface PurchaseItemCategory {
  id: string
  name: string
  bill_count: number
}

export interface Transport {
  id: string
  name: string
  vehicle_number: string
  ownership: TransportOwnership
  measure: string
  transport_average: string
  diesel_average: string
  km_running_track: string
  created_at: string
}

export interface TransportBill {
  id: string
  bill_date: string
  transport_id: string
  transport_name: string
  vehicle_number: string
  zone_id: string
  zone_name: string
  purchase_item_category_id: string
  category_name: string
  bill_number: string | null
  amount: string
  note: string | null
  created_at: string
}

export interface TransportSummary {
  total_transport: number
  own_count: number
  rented_count: number
  total_km_running: string
  total_bill_amount: string
}

export interface ZoneWiseReportRow {
  zone_id: string
  zone_name: string
  bill_count: number
  total_amount: string
}

export interface CategoryWiseReportRow {
  category_id: string
  category_name: string
  bill_count: number
  total_amount: string
}

export interface AuditLogEntry {
  id: string
  actor_name: string
  action: string
  created_at: string
}

export interface LoanScheduleInstallment {
  id: string
  installment_number: number
  due_date: string
  opening_principal: string
  principal_component: string
  interest_component: string
  tax_component: string
  total_installment_amount: string
  paid_amount: string
  remaining_amount: string
  status: InstallmentStatus
}

export interface LoanRepaymentRecord {
  id: string
  installment_id: string | null
  payment_date: string
  method: PaymentMethod
  principal_amount: string
  interest_amount: string
  tax_amount: string
  total_amount: string
  tax_deduction_date: string | null
  tax_reference: string | null
  reference: string | null
  notes: string | null
  created_at: string
}

export interface LoanLedgerEntryRecord {
  id: string
  entry_type: LoanLedgerEntryType
  description: string
  debit: string
  credit: string
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

export interface Loan {
  id: string
  loan_number: string
  loan_type: LoanType
  party_type: LoanPartyType
  party_id: string | null
  party_name: string
  principal_amount: string
  loan_date: string
  disbursement_method: PaymentMethod
  interest_rate: string
  interest_type: InterestCalculationMethod
  tenure_months: number
  repayment_frequency: RepaymentFrequency
  first_repayment_date: string
  maturity_date: string
  tax_type: string | null
  tax_rate: string | null
  outstanding_principal: string
  outstanding_interest: string
  total_interest: string
  paid_amount: string
  status: LoanRecordStatus
  notes: string | null
}

export interface LoanDetail extends Loan {
  installments: LoanScheduleInstallment[]
  repayments: LoanRepaymentRecord[]
  ledger_entries: LoanLedgerEntryRecord[]
}
