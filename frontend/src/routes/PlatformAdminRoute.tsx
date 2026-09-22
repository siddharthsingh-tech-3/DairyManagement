import { Outlet } from 'react-router-dom'
import { Alert, Box } from '@mui/material'
import { useAuthStore } from '@/store/authStore'

export function PlatformAdminRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user?.is_platform_admin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You don't have access to this module.</Alert>
      </Box>
    )
  }
  return <Outlet />
}
