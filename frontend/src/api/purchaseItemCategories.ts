import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { PurchaseItemCategory } from '@/types/models'

export async function listPurchaseItemCategories(): Promise<PurchaseItemCategory[]> {
  const res = await apiClient.get<Envelope<PurchaseItemCategory[]>>('/purchase-item-categories')
  return res.data.data
}

export async function createPurchaseItemCategory(name: string): Promise<PurchaseItemCategory> {
  const res = await apiClient.post<Envelope<PurchaseItemCategory>>('/purchase-item-categories', { name })
  return res.data.data
}

export async function renamePurchaseItemCategory(id: string, name: string): Promise<PurchaseItemCategory> {
  const res = await apiClient.patch<Envelope<PurchaseItemCategory>>(`/purchase-item-categories/${id}`, { name })
  return res.data.data
}

export async function deletePurchaseItemCategory(id: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/purchase-item-categories/${id}`)
}
