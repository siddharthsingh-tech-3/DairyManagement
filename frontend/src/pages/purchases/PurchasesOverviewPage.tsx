import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Grid2 as Grid, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { listPurchaseOrders } from '@/api/purchases'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { usePermission } from '@/hooks/usePermissions'
import { formatCompactCurrency, formatCurrency } from '@/utils/format'
import { brand } from '@/theme/theme'
import type { PurchaseOrder } from '@/types/models'

export function PurchasesOverviewPage() {
  const navigate = useNavigate()
  const { can } = usePermission('purchases')
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => listPurchaseOrders() })

  const totals = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.total_amount), 0)
    const paid = orders.filter((o) => o.status === 'received').reduce((s, o) => s + Number(o.total_amount), 0)
    const unpaid = orders.filter((o) => o.status === 'ordered').reduce((s, o) => s + Number(o.total_amount), 0)
    return { total, paid, unpaid }
  }, [orders])

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'po_number', header: 'PO #', render: (o) => <Typography color="primary.main" fontWeight={500} fontSize={13}>{o.po_number}</Typography> },
    { key: 'vendor', header: 'Vendor', render: (o) => o.vendor_name },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'date', header: 'Date', render: (o) => o.order_date },
    { key: 'amount', header: 'Amount', align: 'right', render: (o) => formatCurrency(o.total_amount) },
  ]

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Total Purchases" value={formatCompactCurrency(totals.total)} hint="Sum of all purchase orders" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Paid" value={formatCompactCurrency(totals.paid)} hint="Based on 'Received' status" hintColor={brand.positive} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Unpaid" value={formatCompactCurrency(totals.unpaid)} hint="Based on 'Ordered' status" hintColor={brand.warning} />
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Purchases
          </Typography>
          <Typography color="text.secondary">Manage your purchase orders.</Typography>
        </Box>
        {can('full') && (
          <Button variant="contained" onClick={() => navigate('/purchases/orders/new')}>
            + Create Purchase
          </Button>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={orders}
        getRowId={(o) => o.id}
        searchPlaceholder="Search by PO # or vendor…"
        searchPredicate={(o, q) => o.po_number.toLowerCase().includes(q) || o.vendor_name.toLowerCase().includes(q)}
        emptyMessage={isLoading ? 'Loading…' : 'No purchase orders yet'}
      />
    </Stack>
  )
}
