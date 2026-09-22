import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { ItemType, Product } from '@/types/models'
import type { StockMovementType } from '@/types/enums'

export interface ProductPayload {
  sku: string
  name: string
  item_type?: ItemType
  category?: string | null
  hsn_code: string
  rate: number
  purchase_price?: number | null
  sales_price_includes_tax?: boolean
  purchase_price_includes_tax?: boolean
  gst_percent: number
  discount_percent?: number | null
  unit?: string
  alternative_unit?: string | null
  reorder_level: number
  low_stock_alert_enabled?: boolean
  current_stock: number
  opening_stock_date?: string | null
  show_in_online_store?: boolean
  batch_no?: string | null
  expiry_date?: string | null
  description?: string | null
}

export type ProductUpdatePayload = Partial<ProductPayload & { is_active: boolean }>

export async function listProducts(): Promise<Product[]> {
  const res = await apiClient.get<Envelope<Product[]>>('/products')
  return res.data.data
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const res = await apiClient.post<Envelope<Product>>('/products', payload)
  return res.data.data
}

export async function updateProduct(id: string, payload: ProductUpdatePayload): Promise<Product> {
  const res = await apiClient.patch<Envelope<Product>>(`/products/${id}`, payload)
  return res.data.data
}

export async function bulkCreateProducts(items: ProductPayload[]): Promise<Product[]> {
  const res = await apiClient.post<Envelope<Product[]>>('/products/bulk', { items })
  return res.data.data
}

export async function bulkUpdateProducts(ids: string[], updates: ProductUpdatePayload): Promise<Product[]> {
  const res = await apiClient.patch<Envelope<Product[]>>('/products/bulk', { ids, updates })
  return res.data.data
}

export async function adjustStock(
  id: string,
  movement_type: StockMovementType,
  quantity_delta: number,
  note?: string,
): Promise<Product> {
  const res = await apiClient.post<Envelope<Product>>(`/products/${id}/stock-movements`, {
    movement_type,
    quantity_delta,
    note,
  })
  return res.data.data
}

export async function reorderStock(id: string): Promise<Product> {
  const res = await apiClient.post<Envelope<Product>>(`/products/${id}/reorder`)
  return res.data.data
}
