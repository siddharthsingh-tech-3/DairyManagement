export type ReportCategory = 'gst' | 'transaction' | 'item' | 'party' | 'other'

export interface ReportDefinition {
  slug: string
  label: string
  category: ReportCategory
  favourite?: boolean
  tags?: string[]
}

export const REPORTS: ReportDefinition[] = [
  { slug: 'balance-sheet', label: 'Balance Sheet', category: 'other', favourite: true, tags: ['summary'] },
  { slug: 'gstr-1-sales', label: 'GSTR-1 (Sales)', category: 'gst', favourite: true, tags: ['invoice-details'] },
  { slug: 'profit-and-loss-report', label: 'Profit And Loss Report', category: 'other', favourite: true, tags: ['summary'] },
  { slug: 'sales-summary-staff-wise', label: 'Sales Summary - Staff Wise', category: 'other', favourite: true, tags: ['summary'] },

  { slug: 'gstr-2-purchase', label: 'GSTR-2 (Purchase)', category: 'gst', tags: ['invoice-details'] },
  { slug: 'gstr-3b', label: 'GSTR-3b', category: 'gst', tags: ['summary'] },
  { slug: 'gst-purchase-with-hsn', label: 'GST Purchase (With HSN)', category: 'gst', tags: ['invoice-details'] },
  { slug: 'gst-sales-with-hsn', label: 'GST Sales (With HSN)', category: 'gst', tags: ['invoice-details'] },
  { slug: 'hsn-wise-sales-summary', label: 'HSN Wise Sales Summary', category: 'gst', tags: ['summary'] },
  { slug: 'tds-payable', label: 'TDS Payable', category: 'gst', tags: ['payment-collection'] },
  { slug: 'tds-receivable', label: 'TDS Receivable', category: 'gst', tags: ['payment-collection'] },
  { slug: 'tcs-payable', label: 'TCS Payable', category: 'gst', tags: ['payment-collection'] },
  { slug: 'tcs-receivable', label: 'TCS Receivable', category: 'gst', tags: ['payment-collection'] },

  { slug: 'bill-wise-profit', label: 'Bill Wise Profit', category: 'transaction', tags: ['invoice-details'] },
  { slug: 'cash-and-bank-report', label: 'Cash and Bank Report (All Payments)', category: 'transaction', tags: ['payment-collection'] },
  { slug: 'daybook-staff-wise', label: 'Daybook - Staff Wise', category: 'transaction', tags: ['summary'] },
  { slug: 'expense-category-report', label: 'Expense Category Report', category: 'transaction', tags: ['category'] },
  { slug: 'expense-transaction-report', label: 'Expense Transaction Report', category: 'transaction', tags: [] },
  { slug: 'purchase-summary', label: 'Purchase Summary', category: 'transaction', tags: ['summary'] },

  { slug: 'item-report-by-party', label: 'Item Report By Party', category: 'item', tags: ['party', 'item'] },
  { slug: 'item-sales-and-purchase-summary', label: 'Item Sales and Purchase Summary', category: 'item', tags: ['item', 'summary'] },
  { slug: 'low-stock-summary', label: 'Low Stock Summary', category: 'item', tags: ['item', 'summary'] },
  { slug: 'rate-list', label: 'Rate List', category: 'item', tags: ['item'] },
  { slug: 'stock-detail-report', label: 'Stock Detail Report', category: 'item', tags: ['item'] },
  { slug: 'stock-summary', label: 'Stock Summary', category: 'item', tags: ['item', 'summary'] },

  { slug: 'receivable-ageing-report', label: 'Receivable Ageing Report', category: 'party', tags: ['party', 'payment-collection'] },
  { slug: 'party-report-by-item', label: 'Party Report By Item', category: 'party', tags: ['party', 'item'] },
  { slug: 'party-statement-ledger', label: 'Party Statement (Ledger)', category: 'party', tags: ['party'] },
  { slug: 'party-wise-outstanding', label: 'Party Wise Outstanding', category: 'party', tags: ['party', 'payment-collection'] },
  { slug: 'sales-summary-category-wise', label: 'Sales Summary - Category Wise', category: 'party', tags: ['category', 'summary'] },
]

export const FILTER_CHIPS: { key: string; label: string }[] = [
  { key: 'party', label: 'Party' },
  { key: 'category', label: 'Category' },
  { key: 'payment-collection', label: 'Payment Collection' },
  { key: 'item', label: 'Item' },
  { key: 'invoice-details', label: 'Invoice Details' },
  { key: 'summary', label: 'Summary' },
]

export function findReportBySlug(slug: string | undefined): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug)
}
