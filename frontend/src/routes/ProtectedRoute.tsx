import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useCurrentUser } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/LoadingScreen'

export function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()
  const { isLoading, isError } = useCurrentUser()

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (isLoading) {
    return <LoadingScreen />
  }
  if (isError) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}
