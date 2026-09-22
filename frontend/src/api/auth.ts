import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { User } from '@/types/models'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await apiClient.post<Envelope<TokenResponse>>('/auth/login', { email, password })
  return res.data.data
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refresh_token: refreshToken })
}

export async function fetchMe(): Promise<User> {
  const res = await apiClient.get<Envelope<User>>('/auth/me')
  return res.data.data
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, new_password: newPassword })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
