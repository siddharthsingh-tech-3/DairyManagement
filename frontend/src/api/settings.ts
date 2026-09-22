import { apiClient } from './client'
import type { Envelope } from '@/types/api'

export interface BusinessSetting {
  key: string
  value: string
}

export async function listSettings(): Promise<BusinessSetting[]> {
  const res = await apiClient.get<Envelope<BusinessSetting[]>>('/settings')
  return res.data.data
}

export async function updateSetting(key: string, value: string): Promise<BusinessSetting> {
  const res = await apiClient.put<Envelope<BusinessSetting>>('/settings', { key, value })
  return res.data.data
}
