import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type {
  CreditNote,
  DeliveryChallan,
  PaymentIn,
  ProformaInvoice,
  Quotation,
  SalesInvoice,
  SalesReturn,
} from '@/types/models'
import type { PaymentMethod } from '@/types/enums'

export interface SalesItemInput {
  product_id?: string | null
  description: string
  hsn_code?: string
  quantity: number
  rate: number
  discount_percent?: number
  tax_percent?: number
}

export interface SalesAdjustmentItemInput {
  product_id?: string | null
  description: string
  hsn_code?: string
  quantity: number
  rate: number
  tax_percent?: number
}

// --- Quotations ---

export async function listQuotations(vendorId?: string): Promise<Quotation[]> {
  const res = await apiClient.get<Envelope<Quotation[]>>('/sales/quotations', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createQuotation(payload: {
  vendor_id: string
  quote_date: string
  valid_till?: string | null
  notes?: string | null
  discount_amount?: number
  round_off?: number
  items: SalesItemInput[]
}): Promise<Quotation> {
  const res = await apiClient.post<Envelope<Quotation>>('/sales/quotations', payload)
  return res.data.data
}

// --- Sales Invoices ---

export async function listSalesInvoices(vendorId?: string): Promise<SalesInvoice[]> {
  const res = await apiClient.get<Envelope<SalesInvoice[]>>('/sales/invoices', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createSalesInvoice(payload: {
  vendor_id: string
  quotation_id?: string | null
  invoice_number?: string | null
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
  items: SalesItemInput[]
}): Promise<SalesInvoice> {
  const res = await apiClient.post<Envelope<SalesInvoice>>('/sales/invoices', payload)
  return res.data.data
}

export async function cancelSalesInvoice(id: string): Promise<SalesInvoice> {
  const res = await apiClient.post<Envelope<SalesInvoice>>(`/sales/invoices/${id}/cancel`)
  return res.data.data
}

// --- Payments In ---

export async function listPaymentsIn(vendorId?: string): Promise<PaymentIn[]> {
  const res = await apiClient.get<Envelope<PaymentIn[]>>('/sales/payments-in', { params: { vendor_id: vendorId } })
  return res.data.data
}

export interface PaymentInAllocationInput {
  sales_invoice_id: string
  amount: number
  discount?: number
}

export async function createPaymentIn(payload: {
  vendor_id: string
  payment_number?: string | null
  amount: number
  discount_amount?: number
  payment_date: string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
  allocations?: PaymentInAllocationInput[]
}): Promise<PaymentIn> {
  const res = await apiClient.post<Envelope<PaymentIn>>('/sales/payments-in', payload)
  return res.data.data
}

// --- Sales Returns ---

export async function listSalesReturns(vendorId?: string): Promise<SalesReturn[]> {
  const res = await apiClient.get<Envelope<SalesReturn[]>>('/sales/returns', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createSalesReturn(payload: {
  vendor_id: string
  sales_invoice_id?: string | null
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
  items: SalesAdjustmentItemInput[]
}): Promise<SalesReturn> {
  const res = await apiClient.post<Envelope<SalesReturn>>('/sales/returns', payload)
  return res.data.data
}

// --- Credit Notes ---

export async function listCreditNotes(vendorId?: string): Promise<CreditNote[]> {
  const res = await apiClient.get<Envelope<CreditNote[]>>('/sales/credit-notes', { params: { vendor_id: vendorId } })
  return res.data.data
}

export async function createCreditNote(payload: {
  vendor_id: string
  sales_invoice_id?: string | null
  sales_return_id?: string | null
  credit_note_number?: string | null
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
  items: SalesAdjustmentItemInput[]
}): Promise<CreditNote> {
  const res = await apiClient.post<Envelope<CreditNote>>('/sales/credit-notes', payload)
  return res.data.data
}

// --- Delivery Challans ---

export async function listDeliveryChallans(vendorId?: string): Promise<DeliveryChallan[]> {
  const res = await apiClient.get<Envelope<DeliveryChallan[]>>('/sales/delivery-challans', {
    params: { vendor_id: vendorId },
  })
  return res.data.data
}

export async function createDeliveryChallan(payload: {
  vendor_id: string
  quotation_id?: string | null
  challan_number?: string | null
  challan_date: string
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
  items: SalesItemInput[]
}): Promise<DeliveryChallan> {
  const res = await apiClient.post<Envelope<DeliveryChallan>>('/sales/delivery-challans', payload)
  return res.data.data
}

// --- Proforma Invoices ---

export async function listProformaInvoices(vendorId?: string): Promise<ProformaInvoice[]> {
  const res = await apiClient.get<Envelope<ProformaInvoice[]>>('/sales/proforma-invoices', {
    params: { vendor_id: vendorId },
  })
  return res.data.data
}

export async function createProformaInvoice(payload: {
  vendor_id: string
  quotation_id?: string | null
  proforma_number?: string | null
  proforma_date: string
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
  items: SalesItemInput[]
}): Promise<ProformaInvoice> {
  const res = await apiClient.post<Envelope<ProformaInvoice>>('/sales/proforma-invoices', payload)
  return res.data.data
}
