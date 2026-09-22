import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Grid2 as Grid, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { listQuotations } from '@/api/sales'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { usePermission } from '@/hooks/usePermissions'
import { formatCompactCurrency, formatCurrency } from '@/utils/format'
import { brand } from '@/theme/theme'
import type { Quotation } from '@/types/models'

export function QuotationsPage() {
  const navigate = useNavigate()
  const { can } = usePermission('sales')
  const { data: quotations = [], isLoading } = useQuery({ queryKey: ['quotations'], queryFn: () => listQuotations() })

  const totals = useMemo(() => {
    const total = quotations.reduce((s, q) => s + Number(q.total_amount), 0)
    const accepted = quotations.filter((q) => q.status === 'accepted').reduce((s, q) => s + Number(q.total_amount), 0)
    const pending = quotations.filter((q) => q.status === 'sent' || q.status === 'draft').reduce((s, q) => s + Number(q.total_amount), 0)
    return { total, accepted, pending }
  }, [quotations])

  const columns: DataTableColumn<Quotation>[] = [
    { key: 'quote_number', header: 'Quote #', render: (q) => <Typography color="primary.main" fontWeight={500} fontSize={13}>{q.quote_number}</Typography> },
    { key: 'vendor', header: 'Party Name', render: (q) => q.vendor_name },
    { key: 'status', header: 'Status', render: (q) => <StatusBadge status={q.status} /> },
    { key: 'date', header: 'Date', render: (q) => q.quote_date },
    { key: 'amount', header: 'Amount', align: 'right', render: (q) => formatCurrency(q.total_amount) },
  ]

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Total Quotations" value={formatCompactCurrency(totals.total)} hint="Sum of all quotations" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Accepted" value={formatCompactCurrency(totals.accepted)} hint="Based on 'Accepted' status" hintColor={brand.positive} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Pending" value={formatCompactCurrency(totals.pending)} hint="Based on 'Draft'/'Sent' status" hintColor={brand.warning} />
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Quotation/Estimate
          </Typography>
          <Typography color="text.secondary">Manage quotations and estimates sent to customers.</Typography>
        </Box>
        {can('full') && (
          <Button variant="contained" onClick={() => navigate('/sales/quotations/new')}>
            + Create Quotation
          </Button>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={quotations}
        getRowId={(q) => q.id}
        searchPlaceholder="Search by quote # or party…"
        searchPredicate={(q, query) => q.quote_number.toLowerCase().includes(query) || q.vendor_name.toLowerCase().includes(query)}
        emptyMessage={isLoading ? 'Loading…' : 'No quotations yet'}
      />
    </Stack>
  )
}
