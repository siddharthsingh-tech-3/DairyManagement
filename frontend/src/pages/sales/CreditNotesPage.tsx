import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Stack, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { useQuery } from '@tanstack/react-query'
import { listCreditNotes } from '@/api/sales'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { SalesDocumentSettingsDialog } from '@/features/sales/SalesDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { formatCurrency } from '@/utils/format'
import type { CreditNote } from '@/types/models'

export function CreditNotesPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const { can } = usePermission('sales')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { data: notes = [], isLoading } = useQuery({ queryKey: ['credit-notes'], queryFn: () => listCreditNotes() })

  const columns: DataTableColumn<CreditNote>[] = [
    { key: 'date', header: 'Date', sortValue: (n) => n.note_date, render: (n) => n.note_date },
    {
      key: 'credit_note_number',
      header: 'Credit Note Number',
      sortValue: (n) => n.credit_note_number,
      render: (n) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {n.credit_note_number}
        </Typography>
      ),
    },
    { key: 'vendor', header: 'Party Name', sortValue: (n) => n.vendor_name, render: (n) => <Typography fontWeight={500} fontSize={13}>{n.vendor_name}</Typography> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (n) => Number(n.total_amount), render: (n) => formatCurrency(n.total_amount) },
    { key: 'status', header: 'Status', render: (n) => <StatusBadge status={n.status} /> },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Credit Note
          </Typography>
          <Typography color="text.secondary">Manage your credit notes.</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          {can('full') && (
            <Button variant="contained" onClick={() => navigate('/sales/credit-notes/new')}>
              + Create Credit Note
            </Button>
          )}
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={notes}
        getRowId={(n) => n.id}
        searchPlaceholder="Search by credit note # or party…"
        searchPredicate={(n, q) => n.credit_note_number.toLowerCase().includes(q) || n.vendor_name.toLowerCase().includes(q)}
        onRowClick={(n) =>
          n.sales_invoice_id ? navigate(`/sales/invoices/${n.sales_invoice_id}`) : toast('No invoice linked to this credit note', 'error')
        }
        emptyMessage={isLoading ? 'Loading…' : 'No credit notes found'}
      />

      <SalesDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="credit_note"
        title="Quick Credit Note Settings"
        showPriceHistory={false}
      />
    </Stack>
  )
}
