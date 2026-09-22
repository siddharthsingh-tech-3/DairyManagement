import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { User } from '@/types/models'
import type { UserRole } from '@/types/enums'

export interface UserCreatePayload {
  email: string
  phone?: string | null
  password: string
  full_name: string
  role: UserRole
  vendor_id?: string | null
  driver_id?: string | null
}

export async function listUsers(): Promise<User[]> {
  const res = await apiClient.get<Envelope<User[]>>('/users')
  return res.data.data
}

export async function createUser(payload: UserCreatePayload): Promise<User> {
  const res = await apiClient.post<Envelope<User>>('/users', payload)
  return res.data.data
}

export async function updateUser(
  id: string,
  payload: Partial<{ full_name: string; phone: string | null; is_active: boolean }>,
): Promise<User> {
  const res = await apiClient.patch<Envelope<User>>(`/users/${id}`, payload)
  return res.data.data
}

export async function setUserPassword(id: string, new_password: string): Promise<User> {
  const res = await apiClient.post<Envelope<User>>(`/users/${id}/set-password`, { new_password })
  return res.data.data
}
