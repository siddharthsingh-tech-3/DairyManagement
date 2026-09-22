import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Invoice, Payment } from '@/types/models'
import type { PaymentMethod } from '@/types/enums'

export async function listInvoices(vendorId?: string): Promise<Invoice[]> {
  const res = await apiClient.get<Envelope<Invoice[]>>('/billing/invoices', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await apiClient.get<Envelope<Invoice>>(`/billing/invoices/${id}`)
  return res.data.data
}

export async function generateInvoice(vendor_id: string, period_month: string): Promise<Invoice> {
  const res = await apiClient.post<Envelope<Invoice>>('/billing/invoices/generate', { vendor_id, period_month })
  return res.data.data
}

export async function payInvoiceFull(id: string): Promise<Invoice> {
  const res = await apiClient.post<Envelope<Invoice>>(`/billing/invoices/${id}/pay`)
  return res.data.data
}

export async function remindInvoice(id: string): Promise<void> {
  await apiClient.post(`/billing/invoices/${id}/remind`)
}

export async function listPayments(vendorId?: string): Promise<Payment[]> {
  const res = await apiClient.get<Envelope<Payment[]>>('/billing/payments', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function recordPayment(payload: {
  vendor_id: string
  invoice_id?: string | null
  order_id?: string | null
  amount: number
  tds_amount?: number
  method: PaymentMethod
  reference?: string | null
}): Promise<Payment> {
  const res = await apiClient.post<Envelope<Payment>>('/billing/payments', payload)
  return res.data.data
}
