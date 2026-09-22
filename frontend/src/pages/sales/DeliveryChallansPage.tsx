import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { useQuery } from '@tanstack/react-query'
import { listDeliveryChallans } from '@/api/sales'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { SalesDocumentSettingsDialog } from '@/features/sales/SalesDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { formatCurrency } from '@/utils/format'
import type { DeliveryChallan } from '@/types/models'

export function DeliveryChallansPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const { can } = usePermission('sales')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: challans = [], isLoading } = useQuery({ queryKey: ['delivery-challans'], queryFn: () => listDeliveryChallans() })

  const columns: DataTableColumn<DeliveryChallan>[] = [
    { key: 'date', header: 'Date', sortValue: (c) => c.challan_date, render: (c) => c.challan_date },
    {
      key: 'challan_number',
      header: 'Challan Number',
      sortValue: (c) => c.challan_number,
      render: (c) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {c.challan_number}
        </Typography>
      ),
    },
    { key: 'vendor', header: 'Party Name', sortValue: (c) => c.vendor_name, render: (c) => <Typography fontWeight={500} fontSize={13}>{c.vendor_name}</Typography> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (c) => Number(c.total_amount), render: (c) => formatCurrency(c.total_amount) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Delivery Challan
          </Typography>
          <Typography color="text.secondary">Track goods dispatched to customers ahead of invoicing.</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          {can('full') && (
            <Button variant="contained" onClick={() => navigate('/sales/delivery-challans/new')}>
              + Create Delivery Challan
            </Button>
          )}
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={challans}
        getRowId={(c) => c.id}
        searchPlaceholder="Search by challan # or party…"
        searchPredicate={(c, q) => c.challan_number.toLowerCase().includes(q) || c.vendor_name.toLowerCase().includes(q)}
        onRowClick={(c) =>
          c.sales_invoice_id ? navigate(`/sales/invoices/${c.sales_invoice_id}`) : toast('No invoice linked to this challan yet', 'error')
        }
        emptyMessage={isLoading ? 'Loading…' : 'No delivery challans yet'}
      />

      <SalesDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="delivery_challan"
        title="Quick Delivery Challan Settings"
        showPriceHistory={false}
      />
    </Stack>
  )
}
