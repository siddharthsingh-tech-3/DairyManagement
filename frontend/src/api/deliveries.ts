import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Delivery } from '@/types/models'

export interface ExtraItemPayload {
  product_id: string
  quantity: number
}

export async function listDeliveries(): Promise<Delivery[]> {
  const res = await apiClient.get<Envelope<Delivery[]>>('/deliveries')
  return res.data.data
}

export async function dispatchDelivery(
  id: string,
  payload: { driver_id: string; zone: string; truck_number: string },
): Promise<Delivery> {
  const res = await apiClient.post<Envelope<Delivery>>(`/deliveries/${id}/dispatch`, payload)
  return res.data.data
}

export async function markDelivered(
  id: string,
  payload: {
    delivered_quantity: number
    crates_out: number
    crates_in: number
    extra_items: ExtraItemPayload[]
  },
): Promise<Delivery> {
  const res = await apiClient.post<Envelope<Delivery>>(`/deliveries/${id}/deliver`, payload)
  return res.data.data
}

export async function confirmReceipt(id: string): Promise<Delivery> {
  const res = await apiClient.post<Envelope<Delivery>>(`/deliveries/${id}/confirm`)
  return res.data.data
}

export async function requestExtraItems(id: string, extra_items: ExtraItemPayload[]): Promise<Delivery> {
  const res = await apiClient.post<Envelope<Delivery>>(`/deliveries/${id}/request-extra`, { extra_items })
  return res.data.data
}
