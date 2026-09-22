import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { TransportBill } from '@/types/models'

export interface TransportBillPayload {
  bill_date: string
  transport_id: string
  zone_id: string
  purchase_item_category_id: string
  bill_number?: string | null
  amount: number
  note?: string | null
}

export async function listTransportBills(start?: string, end?: string): Promise<TransportBill[]> {
  const res = await apiClient.get<Envelope<TransportBill[]>>('/transport-bills', { params: { start, end } })
  return res.data.data
}

export async function createTransportBill(payload: TransportBillPayload): Promise<TransportBill> {
  const res = await apiClient.post<Envelope<TransportBill>>('/transport-bills', payload)
  return res.data.data
}

export async function updateTransportBill(id: string, payload: TransportBillPayload): Promise<TransportBill> {
  const res = await apiClient.put<Envelope<TransportBill>>(`/transport-bills/${id}`, payload)
  return res.data.data
}

export async function deleteTransportBill(id: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/transport-bills/${id}`)
}
