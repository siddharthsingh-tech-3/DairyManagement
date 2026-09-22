import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Offer, OfferDiscountType } from '@/types/models'

export interface OfferPayload {
  title: string
  description?: string | null
  discount_type: OfferDiscountType
  discount_value: number
  valid_from: string
  valid_till?: string | null
  applies_to_all: boolean
  product_ids?: string[]
}

export async function listOffers(): Promise<Offer[]> {
  const res = await apiClient.get<Envelope<Offer[]>>('/offers')
  return res.data.data
}

export async function createOffer(payload: OfferPayload): Promise<Offer> {
  const res = await apiClient.post<Envelope<Offer>>('/offers', payload)
  return res.data.data
}

export async function updateOffer(id: string, payload: Partial<OfferPayload & { is_active: boolean }>): Promise<Offer> {
  const res = await apiClient.patch<Envelope<Offer>>(`/offers/${id}`, payload)
  return res.data.data
}

export async function deleteOffer(id: string): Promise<void> {
  await apiClient.delete(`/offers/${id}`)
}
