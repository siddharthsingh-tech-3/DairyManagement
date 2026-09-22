import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { TransportZone } from '@/types/models'

export async function listTransportZones(): Promise<TransportZone[]> {
  const res = await apiClient.get<Envelope<TransportZone[]>>('/transport-zones')
  return res.data.data
}

export async function createTransportZone(name: string): Promise<TransportZone> {
  const res = await apiClient.post<Envelope<TransportZone>>('/transport-zones', { name })
  return res.data.data
}

export async function renameTransportZone(id: string, name: string): Promise<TransportZone> {
  const res = await apiClient.patch<Envelope<TransportZone>>(`/transport-zones/${id}`, { name })
  return res.data.data
}

export async function deleteTransportZone(id: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/transport-zones/${id}`)
}
