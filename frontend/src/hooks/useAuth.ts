import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as authApi from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authApi.fetchMe()
      setUser(user)
      return user
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: async (tokens) => {
      setSession(tokens.access_token, tokens.refresh_token)
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) await authApi.logout(refreshToken)
    },
    onSettled: () => {
      clear()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
}
