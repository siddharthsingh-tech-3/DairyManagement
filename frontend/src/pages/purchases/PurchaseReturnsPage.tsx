import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { useQuery } from '@tanstack/react-query'
import { listPurchaseReturns } from '@/api/purchases'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { PurchaseDocumentSettingsDialog } from '@/features/purchases/PurchaseDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { formatCurrency } from '@/utils/format'
import type { PurchaseReturn } from '@/types/models'

export function PurchaseReturnsPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const { can } = usePermission('purchases')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: returns = [], isLoading } = useQuery({ queryKey: ['purchase-returns'], queryFn: () => listPurchaseReturns() })

  const columns: DataTableColumn<PurchaseReturn>[] = [
    { key: 'date', header: 'Date', sortValue: (r) => r.return_date, render: (r) => r.return_date },
    {
      key: 'return_number',
      header: 'Purchase Return Number',
      sortValue: (r) => r.return_number,
      render: (r) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {r.return_number}
        </Typography>
      ),
    },
    { key: 'vendor', header: 'Party Name', sortValue: (r) => r.vendor_name, render: (r) => <Typography fontWeight={500} fontSize={13}>{r.vendor_name}</Typography> },
    { key: 'due_in', header: 'Due In', render: (r) => r.due_in ?? '—' },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (r) => Number(r.total_amount), render: (r) => formatCurrency(r.total_amount) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Purchase Return
          </Typography>
          <Typography color="text.secondary">Manage all your purchase returns.</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          {can('full') && (
            <Button variant="contained" onClick={() => navigate('/purchases/returns/new')}>
              + Create Purchase Return
            </Button>
          )}
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={returns}
        getRowId={(r) => r.id}
        searchPlaceholder="Search by return # or party…"
        searchPredicate={(r, q) => r.return_number.toLowerCase().includes(q) || r.vendor_name.toLowerCase().includes(q)}
        onRowClick={(r) =>
          r.purchase_invoice_id ? navigate(`/purchases/invoices/${r.purchase_invoice_id}`) : toast('No invoice linked to this return', 'error')
        }
        emptyMessage={isLoading ? 'Loading…' : 'No purchase returns found'}
      />

      <PurchaseDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="purchase_return"
        title="Quick Purchase Return Settings"
        showPriceHistory={false}
      />
    </Stack>
  )
}
