import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Link, Stack, Typography } from '@mui/material'
import { confirmReceipt, listDeliveries } from '@/api/deliveries'
import { listDrivers } from '@/api/drivers'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { DispatchModal } from '@/features/delivery/DispatchModal'
import { MarkDeliveredModal } from '@/features/delivery/MarkDeliveredModal'
import { DeliveryDetailsDialog } from '@/features/delivery/DeliveryDetailsDialog'
import { useAuthStore } from '@/store/authStore'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { Delivery } from '@/types/models'

export function DeliveryPage() {
  const user = useAuthStore((s) => s.user)
  const isDriver = user?.role === 'driver'
  const isVendor = user?.role === 'vendor'
  const { can } = usePermission('delivery')
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: deliveries = [], isLoading } = useQuery({ queryKey: ['deliveries'], queryFn: listDeliveries })
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: listDrivers, enabled: !isDriver && !isVendor })

  const [dispatchId, setDispatchId] = useState<string | null>(null)
  const [deliverTarget, setDeliverTarget] = useState<Delivery | null>(null)
  const [detailsTarget, setDetailsTarget] = useState<Delivery | null>(null)

  const confirm = useMutation({
    mutationFn: confirmReceipt,
    onSuccess: async () => {
      toast('Receipt confirmed ✓')
      await queryClient.invalidateQueries({ queryKey: ['deliveries'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const zoneLabel = (zone: Delivery['zone']) => (zone === 'zone_1' ? 'Zone 1' : zone === 'zone_2' ? 'Zone 2' : '—')

  const columns: DataTableColumn<Delivery>[] = [
    { key: 'zone', header: 'Zone', render: (d) => zoneLabel(d.zone) },
    {
      key: 'vendor',
      header: 'Vendor',
      sortValue: (d) => d.vendor_name ?? '',
      render: (d) => (
        <Link component="button" underline="hover" onClick={() => setDetailsTarget(d)} sx={{ fontWeight: 500, fontSize: 13, textAlign: 'left' }}>
          {d.vendor_name}
        </Link>
      ),
    },
    {
      key: 'driver',
      header: 'Truck / Driver',
      render: (d) => [d.truck_number, d.driver_name].filter(Boolean).join(' · ') || '—',
    },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" color="inherit" onClick={() => setDetailsTarget(d)}>
            Details
          </Button>
          {(() => {
            if (isDriver) {
              if (d.status === 'dispatched' || d.status === 'pending') {
                return (
                  <Button size="small" variant="contained" onClick={() => setDeliverTarget(d)}>
                    Mark delivered
                  </Button>
                )
              }
              return null
            }
            if (isVendor) {
              if (d.status === 'delivered') {
                return (
                  <Button size="small" variant="contained" color="success" onClick={() => confirm.mutate(d.id)}>
                    Confirm receipt
                  </Button>
                )
              }
              return null
            }
            if (!can('full')) return null
            if (d.status === 'pending') {
              return (
                <Button size="small" variant="contained" onClick={() => setDispatchId(d.id)}>
                  Dispatch
                </Button>
              )
            }
            if (d.status === 'delivered') {
              return (
                <Button size="small" variant="contained" color="success" onClick={() => confirm.mutate(d.id)}>
                  Confirm receipt
                </Button>
              )
            }
            return null
          })()}
        </Stack>
      ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          {isDriver || isVendor ? 'My Deliveries' : 'Delivery Management'}
        </Typography>
        <Typography color="text.secondary">
          {isVendor ? 'Track your orders and confirm receipt once delivered' : 'Dispatch board · stock & crate allocation per truck'}
        </Typography>
      </Box>

      <DataTable columns={columns} rows={deliveries} getRowId={(d) => d.id} emptyMessage={isLoading ? 'Loading…' : 'No deliveries yet'} />

      <DispatchModal deliveryId={dispatchId} drivers={drivers} onClose={() => setDispatchId(null)} />
      <MarkDeliveredModal delivery={deliverTarget} onClose={() => setDeliverTarget(null)} />
      <DeliveryDetailsDialog delivery={detailsTarget} onClose={() => setDetailsTarget(null)} />
    </Stack>
  )
}
