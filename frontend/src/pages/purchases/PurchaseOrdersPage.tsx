import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listPurchaseInvoices, listPurchaseOrders, receivePurchaseOrder } from '@/api/purchases'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { PurchaseDocumentSettingsDialog } from '@/features/purchases/PurchaseDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrency } from '@/utils/format'
import type { PurchaseOrder } from '@/types/models'

export function PurchaseOrdersPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { can } = usePermission('purchases')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => listPurchaseOrders() })
  const { data: invoices = [] } = useQuery({ queryKey: ['purchase-invoices'], queryFn: () => listPurchaseInvoices() })

  const receiveMutation = useMutation({
    mutationFn: (id: string) => receivePurchaseOrder(id),
    onSuccess: async () => {
      toast('Purchase order marked as received')
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'po_number',
      header: 'PO #',
      sortValue: (o) => o.po_number,
      render: (o) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {o.po_number}
        </Typography>
      ),
    },
    { key: 'vendor', header: 'Vendor', sortValue: (o) => o.vendor_name, render: (o) => <Typography fontWeight={500} fontSize={13}>{o.vendor_name}</Typography> },
    { key: 'date', header: 'Date', sortValue: (o) => o.order_date, render: (o) => o.order_date },
    { key: 'valid_till', header: 'Valid Till', render: (o) => o.valid_till ?? '—' },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (o) => Number(o.total_amount), render: (o) => formatCurrency(o.total_amount) },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (o) =>
        o.status !== 'received' &&
        o.status !== 'cancelled' &&
        can('full') && (
          <Button
            size="small"
            variant="outlined"
            disabled={receiveMutation.isPending}
            onClick={(e) => {
              e.stopPropagation()
              receiveMutation.mutate(o.id)
            }}
          >
            Mark Received
          </Button>
        ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Purchase Order
          </Typography>
          <Typography color="text.secondary">Manage your purchase orders.</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          {can('full') && (
            <Button variant="contained" onClick={() => navigate('/purchases/orders/new')}>
              + Create Purchase Order
            </Button>
          )}
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={orders}
        getRowId={(o) => o.id}
        searchPlaceholder="Search by PO # or vendor…"
        searchPredicate={(o, q) => o.po_number.toLowerCase().includes(q) || o.vendor_name.toLowerCase().includes(q)}
        onRowClick={(o) => {
          const invoice = invoices.find((i) => i.purchase_order_id === o.id)
          if (invoice) navigate(`/purchases/invoices/${invoice.id}`)
          else toast('No invoice generated for this purchase order yet', 'error')
        }}
        emptyMessage={isLoading ? 'Loading…' : 'No purchase orders yet'}
      />

      <PurchaseDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="purchase_order"
        title="Quick Purchase Order Settings"
      />
    </Stack>
  )
}
