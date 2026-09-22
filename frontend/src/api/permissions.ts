import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { PermissionEntry } from '@/types/models'
import type { PermissionLevel, UserRole } from '@/types/enums'

export async function getPermissionMatrix(): Promise<PermissionEntry[]> {
  const res = await apiClient.get<Envelope<PermissionEntry[]>>('/permissions')
  return res.data.data
}

export async function updatePermission(
  feature: string,
  role: UserRole,
  level: PermissionLevel,
): Promise<PermissionEntry> {
  const res = await apiClient.put<Envelope<PermissionEntry>>('/permissions', { feature, role, level })
  return res.data.data
}

export async function cyclePermission(feature: string, role: UserRole): Promise<PermissionEntry> {
  const res = await apiClient.post<Envelope<PermissionEntry>>(`/permissions/${feature}/${role}/cycle`)
  return res.data.data
}
