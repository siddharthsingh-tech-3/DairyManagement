import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Button, Card, CardContent, Divider, Grid2 as Grid, Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { listInvoices } from '@/api/billing'
import { getProfitLoss } from '@/api/reports'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { GenerateInvoiceModal } from '@/features/billing/GenerateInvoiceModal'
import { InvoiceDetailDialog } from '@/features/billing/InvoiceDetailDialog'
import { usePermission } from '@/hooks/usePermissions'
import { formatCompactCurrency, formatCurrency } from '@/utils/format'
import { brand, monoFontFamily } from '@/theme/theme'
import type { Invoice } from '@/types/models'

export function BillingPage() {
  const { can } = usePermission('billing')
  const [modalOpen, setModalOpen] = useState(false)
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null)

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => listInvoices() })
  const periodMonth = dayjs().format('YYYY-MM-01')
  const { data: pnl } = useQuery({ queryKey: ['reports', 'profit-loss', periodMonth], queryFn: () => getProfitLoss(periodMonth) })

  const totals = useMemo(() => {
    const revenue = invoices.reduce((s, i) => s + Number(i.subtotal), 0)
    const collected = invoices.reduce((s, i) => s + Number(i.amount_paid), 0)
    const outstanding = invoices.reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid)), 0)
    const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid)), 0)
    return { revenue, collected, outstanding, overdue }
  }, [invoices])

  const columns: DataTableColumn<Invoice>[] = [
    { key: 'id', header: 'Invoice', render: (i) => <Typography fontFamily={monoFontFamily} color="primary.main" fontWeight={600} fontSize={13}>{i.invoice_no}</Typography> },
    { key: 'vendor', header: 'Vendor', sortValue: (i) => i.vendor_name, render: (i) => <Typography fontWeight={500} fontSize={13}>{i.vendor_name}</Typography> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (i) => Number(i.total), render: (i) => formatCurrency(i.total) },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <Button size="small" variant="outlined" onClick={() => setActiveInvoice(i)}>
          View bill
        </Button>
      ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Billing & Accounts
          </Typography>
          <Typography color="text.secondary">Invoices, payments, vendor credit & profit</Typography>
        </Box>
        {can('full') && (
          <Button variant="contained" onClick={() => setModalOpen(true)}>
            + Generate invoice
          </Button>
        )}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Revenue (this month)" value={formatCompactCurrency(totals.revenue)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Collected" value={formatCompactCurrency(totals.collected)} hintColor={brand.positive} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Outstanding" value={formatCompactCurrency(totals.outstanding)} hintColor={brand.warning} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Overdue" value={formatCompactCurrency(totals.overdue)} hintColor={brand.negative} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <DataTable columns={columns} rows={invoices} getRowId={(i) => i.id} emptyMessage={isLoading ? 'Loading…' : 'No invoices yet'} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} sx={{ mb: 1.5 }}>
                Profit & Loss — this month
              </Typography>
              {pnl && (
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Revenue
                    </Typography>
                    <Typography fontWeight={500} fontFamily={monoFontFamily} color="text.primary">
                      {formatCurrency(pnl.revenue)}
                    </Typography>
                  </Stack>
                  <Divider />
                  {Object.entries(pnl.expenses_by_category).map(([cat, amt]) => (
                    <Stack key={cat} direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" textTransform="capitalize">
                        {cat}
                      </Typography>
                      <Typography variant="body2" fontFamily={monoFontFamily} color={brand.negative}>
                        − {formatCurrency(amt)}
                      </Typography>
                    </Stack>
                  ))}
                  <Divider />
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ bgcolor: Number(pnl.net_profit) < 0 ? brand.negativeBg : brand.positiveBg, borderRadius: 2, p: 1.5 }}
                  >
                    <Typography fontWeight={600} color={Number(pnl.net_profit) < 0 ? brand.negative : brand.positive}>
                      Net profit
                    </Typography>
                    <Typography
                      fontWeight={600}
                      color={Number(pnl.net_profit) < 0 ? brand.negative : brand.positive}
                      fontSize={17}
                      fontFamily={monoFontFamily}
                    >
                      {formatCurrency(pnl.net_profit)}
                    </Typography>
                  </Stack>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <GenerateInvoiceModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <InvoiceDetailDialog invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
    </Stack>
  )
}
