import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Transport } from '@/types/models'
import type { TransportOwnership } from '@/types/enums'

export interface TransportPayload {
  name: string
  vehicle_number: string
  ownership: TransportOwnership
  measure: string
  transport_average: number
  diesel_average: number
  km_running_track: number
}

export async function listTransports(): Promise<Transport[]> {
  const res = await apiClient.get<Envelope<Transport[]>>('/transports')
  return res.data.data
}

export async function getTransport(id: string): Promise<Transport> {
  const res = await apiClient.get<Envelope<Transport>>(`/transports/${id}`)
  return res.data.data
}

export async function createTransport(payload: TransportPayload): Promise<Transport> {
  const res = await apiClient.post<Envelope<Transport>>('/transports', payload)
  return res.data.data
}

export async function updateTransport(id: string, payload: TransportPayload): Promise<Transport> {
  const res = await apiClient.put<Envelope<Transport>>(`/transports/${id}`, payload)
  return res.data.data
}

export async function deleteTransport(id: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/transports/${id}`)
}
