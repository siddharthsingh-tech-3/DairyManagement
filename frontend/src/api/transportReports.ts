import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { CategoryWiseReportRow, TransportSummary, ZoneWiseReportRow } from '@/types/models'

export async function getTransportSummary(start?: string, end?: string): Promise<TransportSummary> {
  const res = await apiClient.get<Envelope<TransportSummary>>('/transport-reports/summary', { params: { start, end } })
  return res.data.data
}

export async function getZoneWiseReport(start?: string, end?: string): Promise<ZoneWiseReportRow[]> {
  const res = await apiClient.get<Envelope<ZoneWiseReportRow[]>>('/transport-reports/zone-wise', { params: { start, end } })
  return res.data.data
}

export async function getCategoryWiseReport(start?: string, end?: string): Promise<CategoryWiseReportRow[]> {
  const res = await apiClient.get<Envelope<CategoryWiseReportRow[]>>('/transport-reports/category-wise', {
    params: { start, end },
  })
  return res.data.data
}
