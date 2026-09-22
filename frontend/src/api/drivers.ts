import { apiClient } from './client'
import type { Envelope } from '@/types/api'

export interface Driver {
  id: string
  name: string
  phone: string
  vehicle_number: string
  route: string
  is_active: boolean
}

export async function listDrivers(): Promise<Driver[]> {
  const res = await apiClient.get<Envelope<Driver[]>>('/drivers')
  return res.data.data
}

export async function createDriver(payload: {
  name: string
  phone: string
  vehicle_number: string
  route: string
}): Promise<Driver> {
  const res = await apiClient.post<Envelope<Driver>>('/drivers', payload)
  return res.data.data
}
