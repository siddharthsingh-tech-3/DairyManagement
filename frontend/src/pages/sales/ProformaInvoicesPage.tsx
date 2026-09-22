import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { useQuery } from '@tanstack/react-query'
import { listProformaInvoices } from '@/api/sales'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { SalesDocumentSettingsDialog } from '@/features/sales/SalesDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { formatCurrency } from '@/utils/format'
import type { ProformaInvoice } from '@/types/models'

export function ProformaInvoicesPage() {
  const navigate = useNavigate()
  const { can } = usePermission('sales')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['proforma-invoices'], queryFn: () => listProformaInvoices() })

  const columns: DataTableColumn<ProformaInvoice>[] = [
    { key: 'date', header: 'Date', sortValue: (p) => p.proforma_date, render: (p) => p.proforma_date },
    {
      key: 'proforma_number',
      header: 'Proforma Number',
      sortValue: (p) => p.proforma_number,
      render: (p) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {p.proforma_number}
        </Typography>
      ),
    },
    { key: 'vendor', header: 'Party Name', sortValue: (p) => p.vendor_name, render: (p) => <Typography fontWeight={500} fontSize={13}>{p.vendor_name}</Typography> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (p) => Number(p.total_amount), render: (p) => formatCurrency(p.total_amount) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Proforma Invoice
          </Typography>
          <Typography color="text.secondary">Share preliminary invoices with customers before billing.</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          {can('full') && (
            <Button variant="contained" onClick={() => navigate('/sales/proforma-invoices/new')}>
              + Create Proforma Invoice
            </Button>
          )}
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={invoices}
        getRowId={(p) => p.id}
        searchPlaceholder="Search by proforma # or party…"
        searchPredicate={(p, q) => p.proforma_number.toLowerCase().includes(q) || p.vendor_name.toLowerCase().includes(q)}
        emptyMessage={isLoading ? 'Loading…' : 'No proforma invoices yet'}
      />

      <SalesDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="proforma_invoice"
        title="Quick Proforma Invoice Settings"
        showPriceHistory={false}
      />
    </Stack>
  )
}
