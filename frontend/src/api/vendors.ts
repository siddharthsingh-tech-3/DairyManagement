import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Vendor, VendorBankAccount, VendorCustomField, VendorDetail } from '@/types/models'

export interface BankAccountInput {
  account_holder_name: string
  account_number: string
  ifsc_code: string
  bank_name: string
  is_primary?: boolean
}

export interface CustomFieldInput {
  field_name: string
  field_value: string
}

export interface VendorPayload {
  name: string
  category?: string | null
  contact_name: string
  phone: string
  email?: string | null
  area: string
  route: string
  gstin?: string | null
  pan_number?: string | null
  billing_street?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_pincode?: string | null
  shipping_street?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  shipping_pincode?: string | null
  credit_period_days?: number
  credit_limit: number
  opening_balance?: number
  opening_balance_direction?: 'to_collect' | 'to_pay'
  bank_accounts?: BankAccountInput[]
  custom_fields?: CustomFieldInput[]
  is_supplier?: boolean
}

export async function listVendors(search?: string, isSupplier?: boolean): Promise<Vendor[]> {
  const res = await apiClient.get<Envelope<Vendor[]>>('/vendors', { params: { search, is_supplier: isSupplier } })
  return res.data.data
}

export async function getVendor(id: string): Promise<VendorDetail> {
  const res = await apiClient.get<Envelope<VendorDetail>>(`/vendors/${id}`)
  return res.data.data
}

export async function createVendor(payload: VendorPayload): Promise<Vendor> {
  const res = await apiClient.post<Envelope<Vendor>>('/vendors', payload)
  return res.data.data
}

export async function updateVendor(id: string, payload: Partial<VendorPayload & { is_active: boolean }>): Promise<Vendor> {
  const res = await apiClient.patch<Envelope<Vendor>>(`/vendors/${id}`, payload)
  return res.data.data
}

export async function collectOutstanding(id: string): Promise<Vendor> {
  const res = await apiClient.post<Envelope<Vendor>>(`/vendors/${id}/collect`)
  return res.data.data
}

export async function sendVendorReminder(id: string): Promise<void> {
  await apiClient.post(`/vendors/${id}/remind`)
}

export async function addBankAccount(vendorId: string, payload: BankAccountInput): Promise<VendorBankAccount> {
  const res = await apiClient.post<Envelope<VendorBankAccount>>(`/vendors/${vendorId}/bank-accounts`, payload)
  return res.data.data
}

export async function deleteBankAccount(vendorId: string, accountId: string): Promise<void> {
  await apiClient.delete(`/vendors/${vendorId}/bank-accounts/${accountId}`)
}

export async function addCustomField(vendorId: string, payload: CustomFieldInput): Promise<VendorCustomField> {
  const res = await apiClient.post<Envelope<VendorCustomField>>(`/vendors/${vendorId}/custom-fields`, payload)
  return res.data.data
}

export async function deleteCustomField(vendorId: string, fieldId: string): Promise<void> {
  await apiClient.delete(`/vendors/${vendorId}/custom-fields/${fieldId}`)
}

export interface BulkVendorRow {
  name: string
  phone?: string | null
  gstin?: string | null
  shipping_street?: string | null
  shipping_pincode?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  billing_street?: string | null
  billing_pincode?: string | null
  billing_city?: string | null
  billing_state?: string | null
  opening_balance?: number
  opening_balance_direction?: 'to_collect' | 'to_pay'
  credit_period_days?: number
  email?: string | null
}

export interface BulkVendorRowResult {
  row_index: number
  success: boolean
  name: string
  vendor_id: string | null
  error: string | null
}

export interface BulkVendorCreateResult {
  created_count: number
  failed_count: number
  results: BulkVendorRowResult[]
}

export async function bulkCreateVendors(rows: BulkVendorRow[]): Promise<BulkVendorCreateResult> {
  const res = await apiClient.post<Envelope<BulkVendorCreateResult>>('/vendors/bulk', { rows })
  return res.data.data
}
