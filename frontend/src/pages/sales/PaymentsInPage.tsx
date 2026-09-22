import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { useQuery } from '@tanstack/react-query'
import { listPaymentsIn } from '@/api/sales'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { SalesDocumentSettingsDialog } from '@/features/sales/SalesDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { formatCurrency } from '@/utils/format'
import type { PaymentIn } from '@/types/models'

export function PaymentsInPage() {
  const navigate = useNavigate()
  const { can } = usePermission('sales')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments-in'], queryFn: () => listPaymentsIn() })

  const columns: DataTableColumn<PaymentIn>[] = [
    { key: 'date', header: 'Date', sortValue: (p) => p.payment_date, render: (p) => p.payment_date },
    {
      key: 'payment_number',
      header: 'Payment Number',
      sortValue: (p) => p.payment_number,
      render: (p) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {p.payment_number}
        </Typography>
      ),
    },
    { key: 'vendor', header: 'Party Name', sortValue: (p) => p.vendor_name, render: (p) => <Typography fontWeight={500} fontSize={13}>{p.vendor_name}</Typography> },
    { key: 'method', header: 'Received In', render: (p) => p.method.replace(/_/g, ' ') },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (p) => Number(p.amount), render: (p) => formatCurrency(p.amount) },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Payment In
          </Typography>
          <Typography color="text.secondary">View and manage all incoming payments.</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          {can('full') && (
            <Button variant="contained" onClick={() => navigate('/sales/payments-in/new')}>
              + Create Payment In
            </Button>
          )}
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={payments}
        getRowId={(p) => p.id}
        searchPlaceholder="Search by transaction # or party…"
        searchPredicate={(p, q) => p.payment_number.toLowerCase().includes(q) || p.vendor_name.toLowerCase().includes(q)}
        onRowClick={(p) => navigate(`/sales/payments-in/${p.id}`)}
        emptyMessage={isLoading ? 'Loading…' : 'No payments recorded yet'}
      />

      <SalesDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="payment_in"
        title="Quick Payment In Settings"
        showToggles={false}
        showPriceHistory={false}
      />
    </Stack>
  )
}
