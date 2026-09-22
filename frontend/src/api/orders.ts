import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Order } from '@/types/models'
import type { OrderType, PaymentMethod } from '@/types/enums'

export interface OrderItemPayload {
  product_id: string
  quantity: number
  crates_qty?: number
}

export interface OrderPayload {
  vendor_id?: string | null
  walkin_customer_name?: string | null
  order_type: OrderType
  recurrence_frequency?: string | null
  delivery_date?: string | null
  payment_method: PaymentMethod
  items: OrderItemPayload[]
}

export async function listOrders(params?: { status?: string; vendorId?: string }): Promise<Order[]> {
  const res = await apiClient.get<Envelope<Order[]>>('/orders', {
    params: { status: params?.status, vendor_id: params?.vendorId },
  })
  return res.data.data
}

export async function getOrder(id: string): Promise<Order> {
  const res = await apiClient.get<Envelope<Order>>(`/orders/${id}`)
  return res.data.data
}

export async function createOrder(payload: OrderPayload): Promise<Order> {
  const res = await apiClient.post<Envelope<Order>>('/orders', payload)
  return res.data.data
}

export async function updateOrder(
  id: string,
  payload: { delivery_date?: string | null; items: OrderItemPayload[] },
): Promise<Order> {
  const res = await apiClient.patch<Envelope<Order>>(`/orders/${id}`, payload)
  return res.data.data
}

export async function cancelOrder(id: string): Promise<Order> {
  const res = await apiClient.post<Envelope<Order>>(`/orders/${id}/cancel`)
  return res.data.data
}
