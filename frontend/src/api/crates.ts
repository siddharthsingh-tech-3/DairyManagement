import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { CrateDispute, CrateSummaryRow, CrateTransaction } from '@/types/models'
import type { CrateTxnType, DisputeStatus } from '@/types/enums'

export async function getCrateSummary(): Promise<CrateSummaryRow[]> {
  const res = await apiClient.get<Envelope<CrateSummaryRow[]>>('/crates/summary')
  return res.data.data
}

export async function listCrateTransactions(vendorId?: string): Promise<CrateTransaction[]> {
  const res = await apiClient.get<Envelope<CrateTransaction[]>>('/crates/transactions', {
    params: { vendor_id: vendorId },
  })
  return res.data.data
}

export async function postReconciliation(payload: {
  vendor_id: string
  txn_type: CrateTxnType
  quantity: number
  note?: string
}): Promise<void> {
  await apiClient.post('/crates/reconcile', payload)
}

export async function listDisputes(status?: DisputeStatus): Promise<CrateDispute[]> {
  const res = await apiClient.get<Envelope<CrateDispute[]>>('/crates/disputes', { params: { status } })
  return res.data.data
}

export async function resolveDispute(id: string, resolution_note: string): Promise<void> {
  await apiClient.post(`/crates/disputes/${id}/resolve`, { resolution_note })
}
