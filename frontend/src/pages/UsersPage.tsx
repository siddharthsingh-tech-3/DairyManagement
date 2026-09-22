import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid2 as Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockResetOutlined'
import { listUsers } from '@/api/users'
import { cyclePermission, getPermissionMatrix } from '@/api/permissions'
import { AddUserDialog } from '@/features/users/AddUserDialog'
import { SetPasswordDialog } from '@/features/users/SetPasswordDialog'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { brand } from '@/theme/theme'
import type { User } from '@/types/models'
import type { PermissionFeature, PermissionLevel, UserRole } from '@/types/enums'

const FEATURES: { key: PermissionFeature; label: string }[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'crates', label: 'Crates' },
  { key: 'billing', label: 'Billing' },
  { key: 'payments', label: 'Payments' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'reports', label: 'Reports' },
]

const LEVEL_STYLE: Record<PermissionLevel, { bg: string; fg: string; label: string }> = {
  full: { bg: brand.positiveBg, fg: brand.positive, label: '✓' },
  view: { bg: '#eaf6f0', fg: '#2c7e5a', label: 'View' },
  none: { bg: brand.borderInner, fg: brand.textMuted, label: '—' },
}

export function UsersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: listUsers })
  const { data: matrix = [] } = useQuery({ queryKey: ['permissions', 'matrix'], queryFn: getPermissionMatrix })

  const cycle = useMutation({
    mutationFn: ({ feature, role }: { feature: string; role: UserRole }) => cyclePermission(feature, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['permissions', 'matrix'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const levelFor = (feature: string, role: UserRole): PermissionLevel =>
    matrix.find((m) => m.feature === feature && m.role === role)?.level ?? 'none'

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Users & Access Control
        </Typography>
        <Typography color="text.secondary">Role-based permissions · only the Admin can change these</Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography fontWeight={600}>Staff accounts</Typography>
                <Button size="small" variant="outlined" onClick={() => setFormOpen(true)}>
                  + Add
                </Button>
              </Stack>
              <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />} spacing={1.25}>
                {users.map((u) => (
                  <Stack key={u.id} direction="row" alignItems="center" spacing={1.5} sx={{ pt: 1.25 }}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: 12.5, fontWeight: 600, bgcolor: 'primary.main' }}>
                      {u.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={500} fontSize={13.5}>
                        {u.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" textTransform="capitalize">
                        {u.role.replace('_', ' ')}
                      </Typography>
                    </Box>
                    <Chip label={u.is_active ? 'Active' : 'Inactive'} size="small" color={u.is_active ? 'success' : 'default'} />
                    <Tooltip title="Reset password">
                      <IconButton size="small" onClick={() => setResetUser(u)}>
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600}>Permission matrix</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Click a cell to cycle: Full → View → None
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Feature</TableCell>
                    <TableCell align="center">Admin</TableCell>
                    <TableCell align="center">Vendor</TableCell>
                    <TableCell align="center">Truck Owner</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {FEATURES.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell sx={{ fontWeight: 500 }}>{f.label}</TableCell>
                      <TableCell align="center">
                        <Chip label="✓" size="small" sx={{ bgcolor: brand.positiveBg, color: brand.positive, fontWeight: 600, minWidth: 44 }} />
                      </TableCell>
                      {(['vendor', 'driver'] as UserRole[]).map((role) => {
                        const level = levelFor(f.key, role)
                        const style = LEVEL_STYLE[level]
                        return (
                          <TableCell key={role} align="center">
                            <Chip
                              label={style.label}
                              size="small"
                              onClick={() => cycle.mutate({ feature: f.key, role })}
                              sx={{ bgcolor: style.bg, color: style.fg, fontWeight: 500, cursor: 'pointer', minWidth: 44 }}
                            />
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <AddUserDialog open={formOpen} onClose={() => setFormOpen(false)} />
      <SetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />
    </Stack>
  )
}
