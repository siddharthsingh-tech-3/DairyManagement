import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { ExpenseCategory } from '@/types/models'

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const res = await apiClient.get<Envelope<ExpenseCategory[]>>('/expense-categories')
  return res.data.data
}

export async function createExpenseCategory(name: string): Promise<ExpenseCategory> {
  const res = await apiClient.post<Envelope<ExpenseCategory>>('/expense-categories', { name })
  return res.data.data
}

export async function renameExpenseCategory(id: string, name: string): Promise<ExpenseCategory> {
  const res = await apiClient.patch<Envelope<ExpenseCategory>>(`/expense-categories/${id}`, { name })
  return res.data.data
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/expense-categories/${id}`)
}
