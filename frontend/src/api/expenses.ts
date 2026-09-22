import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Expense } from '@/types/models'

export interface ExpenseItemInput {
  description: string
  amount: number
  tax_percent?: number
}

export async function listExpenses(start?: string, end?: string): Promise<Expense[]> {
  const res = await apiClient.get<Envelope<Expense[]>>('/expenses', { params: { start, end } })
  return res.data.data
}

export async function createExpense(payload: {
  expense_number?: string | null
  category: string
  expense_date: string
  payee?: string | null
  payment_mode?: string | null
  original_invoice_number?: string | null
  is_gst_applicable?: boolean
  is_paid?: boolean
  note?: string | null
  items: ExpenseItemInput[]
}): Promise<Expense> {
  const res = await apiClient.post<Envelope<Expense>>('/expenses', payload)
  return res.data.data
}

export async function markExpensePaid(id: string): Promise<Expense> {
  const res = await apiClient.post<Envelope<Expense>>(`/expenses/${id}/mark-paid`)
  return res.data.data
}

export async function deleteExpense(id: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/expenses/${id}`)
}
