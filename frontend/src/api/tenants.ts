import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Tenant } from '@/types/models'

export interface TenantCreatePayload {
  name: string
  slug: string
  admin_email: string
  admin_name: string
  admin_password: string
}

export async function listTenants(): Promise<Tenant[]> {
  const res = await apiClient.get<Envelope<Tenant[]>>('/tenants')
  return res.data.data
}

export async function createTenant(payload: TenantCreatePayload): Promise<Tenant> {
  const res = await apiClient.post<Envelope<Tenant>>('/tenants', payload)
  return res.data.data
}

export async function setTenantActive(id: string, is_active: boolean): Promise<Tenant> {
  const res = await apiClient.patch<Envelope<Tenant>>(`/tenants/${id}`, { is_active })
  return res.data.data
}
