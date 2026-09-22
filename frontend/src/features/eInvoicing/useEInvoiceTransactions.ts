import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCreditNotes, listSalesInvoices, listSalesReturns } from '@/api/sales'
import { listDebitNotes } from '@/api/purchases'
import { listVendors } from '@/api/vendors'
import type { EInvoiceTxnType } from './eInvoiceStorage'

export interface EInvoiceTransactionItem {
  description: string
  hsnCode: string
}

export interface EInvoiceTransaction {
  id: string
  type: EInvoiceTxnType
  typeLabel: string
  number: string
  date: string
  vendorId: string
  partyName: string
  partyPhone: string
  totalAmount: number
  unpaidAmount: number
  items: EInvoiceTransactionItem[]
}

export const E_INVOICE_TYPE_LABELS: Record<EInvoiceTxnType, string> = {
  sales_invoice: 'Sales Invoices',
  credit_note: 'Credit Note',
  sales_return: 'Sales Return',
  debit_note: 'Debit Note',
}

export function useEInvoiceTransactions() {
  const salesInvoices = useQuery({ queryKey: ['sales-invoices'], queryFn: () => listSalesInvoices() })
  const creditNotes = useQuery({ queryKey: ['credit-notes'], queryFn: () => listCreditNotes() })
  const salesReturns = useQuery({ queryKey: ['sales-returns'], queryFn: () => listSalesReturns() })
  const debitNotes = useQuery({ queryKey: ['debit-notes'], queryFn: () => listDebitNotes() })
  const vendors = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors() })

  const vendorPhoneById = useMemo(() => {
    const map = new Map<string, string>()
    for (const v of vendors.data ?? []) map.set(v.id, v.phone)
    return map
  }, [vendors.data])

  const transactions = useMemo<EInvoiceTransaction[]>(() => {
    const rows: EInvoiceTransaction[] = []

    for (const i of salesInvoices.data ?? []) {
      rows.push({
        id: i.id,
        type: 'sales_invoice',
        typeLabel: E_INVOICE_TYPE_LABELS.sales_invoice,
        number: i.invoice_number,
        date: i.invoice_date,
        vendorId: i.vendor_id,
        partyName: i.vendor_name,
        partyPhone: vendorPhoneById.get(i.vendor_id) ?? '',
        totalAmount: Number(i.total_amount),
        unpaidAmount: Number(i.total_amount) - Number(i.amount_paid),
        items: i.items.map((it) => ({ description: it.description, hsnCode: it.hsn_code })),
      })
    }
    for (const c of creditNotes.data ?? []) {
      rows.push({
        id: c.id,
        type: 'credit_note',
        typeLabel: E_INVOICE_TYPE_LABELS.credit_note,
        number: c.credit_note_number,
        date: c.note_date,
        vendorId: c.vendor_id,
        partyName: c.vendor_name,
        partyPhone: vendorPhoneById.get(c.vendor_id) ?? '',
        totalAmount: Number(c.total_amount),
        unpaidAmount: Number(c.total_amount) - Number(c.amount_paid),
        items: c.items.map((it) => ({ description: it.description, hsnCode: it.hsn_code })),
      })
    }
    for (const r of salesReturns.data ?? []) {
      rows.push({
        id: r.id,
        type: 'sales_return',
        typeLabel: E_INVOICE_TYPE_LABELS.sales_return,
        number: r.return_number,
        date: r.return_date,
        vendorId: r.vendor_id,
        partyName: r.vendor_name,
        partyPhone: vendorPhoneById.get(r.vendor_id) ?? '',
        totalAmount: Number(r.total_amount),
        unpaidAmount: Number(r.total_amount) - Number(r.amount_paid),
        items: r.items.map((it) => ({ description: it.description, hsnCode: it.hsn_code })),
      })
    }
    for (const d of debitNotes.data ?? []) {
      rows.push({
        id: d.id,
        type: 'debit_note',
        typeLabel: E_INVOICE_TYPE_LABELS.debit_note,
        number: d.debit_note_number,
        date: d.note_date,
        vendorId: d.vendor_id,
        partyName: d.vendor_name,
        partyPhone: vendorPhoneById.get(d.vendor_id) ?? '',
        totalAmount: Number(d.total_amount),
        unpaidAmount: Number(d.total_amount) - Number(d.amount_paid),
        items: d.items.map((it) => ({ description: it.description, hsnCode: it.hsn_code })),
      })
    }

    rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return rows
  }, [salesInvoices.data, creditNotes.data, salesReturns.data, debitNotes.data, vendorPhoneById])

  return {
    transactions,
    isLoading:
      salesInvoices.isLoading || creditNotes.isLoading || salesReturns.isLoading || debitNotes.isLoading || vendors.isLoading,
  }
}
