import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { DebitNote, PaymentOut, PurchaseInvoice, PurchaseOrder, PurchaseReturn } from '@/types/models'
import type { PaymentMethod } from '@/types/enums'

export interface PurchaseItemInput {
  product_id?: string | null
  description: string
  hsn_code?: string
  quantity: number
  rate: number
  discount_percent?: number
  tax_percent?: number
}

export interface PurchaseAdjustmentItemInput {
  product_id?: string | null
  description: string
  hsn_code?: string
  quantity: number
  rate: number
  tax_percent?: number
}

// --- Purchase Orders ---

export async function listPurchaseOrders(vendorId?: string): Promise<PurchaseOrder[]> {
  const res = await apiClient.get<Envelope<PurchaseOrder[]>>('/purchases/orders', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createPurchaseOrder(payload: {
  vendor_id: string
  po_number?: string | null
  order_date: string
  valid_till?: string | null
  payment_terms?: string | null
  notes?: string | null
  terms_and_conditions?: string | null
  discount_amount?: number
  additional_charges?: number
  tds_amount?: number
  tcs_amount?: number
  round_off?: number
  amount_paid?: number
  authorized_signatory_name?: string | null
  authorized_signatory_signature_url?: string | null
  items: PurchaseItemInput[]
}): Promise<PurchaseOrder> {
  const res = await apiClient.post<Envelope<PurchaseOrder>>('/purchases/orders', payload)
  return res.data.data
}

export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await apiClient.post<Envelope<PurchaseOrder>>(`/purchases/orders/${id}/receive`)
  return res.data.data
}

// --- Purchase Invoices ---

export async function listPurchaseInvoices(vendorId?: string): Promise<PurchaseInvoice[]> {
  const res = await apiClient.get<Envelope<PurchaseInvoice[]>>('/purchases/invoices', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createPurchaseInvoice(payload: {
  vendor_id: string
  purchase_order_id?: string | null
  invoice_number?: string | null
  vendor_invoice_number?: string | null
  invoice_date: string
  due_date?: string | null
  payment_terms?: string | null
  notes?: string | null
  terms_and_conditions?: string | null
  discount_amount?: number
  additional_charges?: number
  tds_amount?: number
  tcs_amount?: number
  round_off?: number
  amount_paid?: number
  authorized_signatory_name?: string | null
  authorized_signatory_signature_url?: string | null
  items: PurchaseItemInput[]
}): Promise<PurchaseInvoice> {
  const res = await apiClient.post<Envelope<PurchaseInvoice>>('/purchases/invoices', payload)
  return res.data.data
}

// --- Payments Out ---

export async function listPaymentsOut(vendorId?: string): Promise<PaymentOut[]> {
  const res = await apiClient.get<Envelope<PaymentOut[]>>('/purchases/payments-out', { params: { vendor_id: vendorId } })
  return res.data.data
}

export interface PaymentOutAllocationInput {
  purchase_invoice_id: string
  amount: number
  discount?: number
}

export async function createPaymentOut(payload: {
  vendor_id: string
  payment_number?: string | null
  amount: number
  discount_amount?: number
  payment_date: string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
  allocations?: PaymentOutAllocationInput[]
}): Promise<PaymentOut> {
  const res = await apiClient.post<Envelope<PaymentOut>>('/purchases/payments-out', payload)
  return res.data.data
}

// --- Purchase Returns ---

export async function listPurchaseReturns(vendorId?: string): Promise<PurchaseReturn[]> {
  const res = await apiClient.get<Envelope<PurchaseReturn[]>>('/purchases/returns', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createPurchaseReturn(payload: {
  vendor_id: string
  purchase_invoice_id?: string | null
  return_number?: string | null
  return_date: string
  due_in?: string | null
  payment_terms?: string | null
  notes?: string | null
  terms_and_conditions?: string | null
  discount_amount?: number
  additional_charges?: number
  tds_amount?: number
  tcs_amount?: number
  round_off?: number
  amount_paid?: number
  authorized_signatory_name?: string | null
  authorized_signatory_signature_url?: string | null
  items: PurchaseAdjustmentItemInput[]
}): Promise<PurchaseReturn> {
  const res = await apiClient.post<Envelope<PurchaseReturn>>('/purchases/returns', payload)
  return res.data.data
}

// --- Debit Notes ---

export async function listDebitNotes(vendorId?: string): Promise<DebitNote[]> {
  const res = await apiClient.get<Envelope<DebitNote[]>>('/purchases/debit-notes', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createDebitNote(payload: {
  vendor_id: string
  purchase_invoice_id?: string | null
  purchase_return_id?: string | null
  debit_note_number?: string | null
  note_date: string
  payment_terms?: string | null
  notes?: string | null
  terms_and_conditions?: string | null
  discount_amount?: number
  additional_charges?: number
  tds_amount?: number
  tcs_amount?: number
  round_off?: number
  amount_paid?: number
  authorized_signatory_name?: string | null
  authorized_signatory_signature_url?: string | null
  items: PurchaseAdjustmentItemInput[]
}): Promise<DebitNote> {
  const res = await apiClient.post<Envelope<DebitNote>>('/purchases/debit-notes', payload)
  return res.data.data
}
