import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Category } from '@/types/models'

export async function listCategories(): Promise<Category[]> {
  const res = await apiClient.get<Envelope<Category[]>>('/categories')
  return res.data.data
}

export async function createCategory(name: string): Promise<Category> {
  const res = await apiClient.post<Envelope<Category>>('/categories', { name })
  return res.data.data
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const res = await apiClient.patch<Envelope<Category>>(`/categories/${id}`, { name })
  return res.data.data
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/categories/${id}`)
}
