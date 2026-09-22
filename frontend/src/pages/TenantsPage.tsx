import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { listTenants, setTenantActive } from '@/api/tenants'
import { AddTenantDialog } from '@/features/tenants/AddTenantDialog'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

export function TenantsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: listTenants })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => setTenantActive(id, is_active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Tenants
          </Typography>
          <Typography color="text.secondary">
            Every distributor business on this deployment · platform admin only
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setFormOpen(true)}>
          + Onboard tenant
        </Button>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Business</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Active</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell sx={{ fontWeight: 500 }}>{t.name}</TableCell>
                  <TableCell sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>{t.slug}</TableCell>
                  <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={t.is_active ? 'Active' : 'Suspended'}
                      size="small"
                      color={t.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={t.is_active}
                      onChange={(e) => toggleActive.mutate({ id: t.id, is_active: e.target.checked })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddTenantDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Stack>
  )
}
