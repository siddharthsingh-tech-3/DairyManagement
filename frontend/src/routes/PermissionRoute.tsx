import { Outlet } from 'react-router-dom'
import { Alert, Box } from '@mui/material'
import { usePermission } from '@/hooks/usePermissions'
import type { PermissionFeature } from '@/types/enums'

export function PermissionRoute({ feature }: { feature: PermissionFeature }) {
  const { can } = usePermission(feature)
  if (!can('view')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">You don't have access to this module.</Alert>
      </Box>
    )
  }
  return <Outlet />
}
