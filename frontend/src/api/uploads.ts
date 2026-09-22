import { apiClient } from './client'
import type { Envelope } from '@/types/api'

export async function uploadFile(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post<Envelope<{ url: string }>>('/uploads', formData, {
    // Override the client's default JSON header so axios lets the browser set the
    // multipart Content-Type (with boundary) for this FormData body.
    headers: { 'Content-Type': false },
  })
  return res.data.data
}
