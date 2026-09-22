import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type {
  AdminDashboard,
  AuditLogEntry,
  BalanceSheet,
  DriverDashboard,
  FinancialSummary,
  LatestTransaction,
  ManualLedgerEntry,
  OperationalReport,
  ProfitLoss,
  SalesTrend,
  TodaysDemandRow,
  VendorDashboard,
} from '@/types/models'
import type { LedgerEntryCategory } from '@/types/enums'

export async function getDashboard<T = AdminDashboard | VendorDashboard | DriverDashboard>(): Promise<T> {
  const res = await apiClient.get<Envelope<T>>('/reports/dashboard')
  return res.data.data
}

export async function getProfitLoss(periodMonth: string): Promise<ProfitLoss> {
  const res = await apiClient.get<Envelope<ProfitLoss>>('/reports/profit-loss', {
    params: { period_month: periodMonth },
  })
  return res.data.data
}

export async function getOperationalReport(): Promise<OperationalReport> {
  const res = await apiClient.get<Envelope<OperationalReport>>('/reports/operational')
  return res.data.data
}

export async function getAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const res = await apiClient.get<Envelope<AuditLogEntry[]>>('/reports/audit-log', { params: { limit } })
  return res.data.data
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const res = await apiClient.get<Envelope<FinancialSummary>>('/reports/financial-summary')
  return res.data.data
}

export async function getSalesTrend(start: string, end: string): Promise<SalesTrend> {
  const res = await apiClient.get<Envelope<SalesTrend>>('/reports/sales-trend', { params: { start, end } })
  return res.data.data
}

export async function getLatestTransactions(limit = 10): Promise<LatestTransaction[]> {
  const res = await apiClient.get<Envelope<LatestTransaction[]>>('/reports/latest-transactions', {
    params: { limit },
  })
  return res.data.data
}

export async function getTodaysDemand(): Promise<TodaysDemandRow[]> {
  const res = await apiClient.get<Envelope<TodaysDemandRow[]>>('/reports/todays-demand')
  return res.data.data
}

export async function getBalanceSheet(): Promise<BalanceSheet> {
  const res = await apiClient.get<Envelope<BalanceSheet>>('/reports/balance-sheet')
  return res.data.data
}

export async function listLedgerEntries(category: LedgerEntryCategory): Promise<ManualLedgerEntry[]> {
  const res = await apiClient.get<Envelope<ManualLedgerEntry[]>>('/reports/balance-sheet/entries', {
    params: { category },
  })
  return res.data.data
}

export async function createLedgerEntry(payload: {
  category: LedgerEntryCategory
  label: string
  amount: number
  entry_date: string
  note?: string | null
}): Promise<ManualLedgerEntry> {
  const res = await apiClient.post<Envelope<ManualLedgerEntry>>('/reports/balance-sheet/entries', payload)
  return res.data.data
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  await apiClient.delete(`/reports/balance-sheet/entries/${id}`)
}
