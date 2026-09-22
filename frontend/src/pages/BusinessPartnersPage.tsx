import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Alert, Box, Button, Grid2 as Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import GroupsIcon from '@mui/icons-material/GroupsOutlined'
import RequestQuoteIcon from '@mui/icons-material/RequestQuoteOutlined'
import { listBusinessPartners } from '@/api/businessPartners'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { PartnerFormDialog } from '@/features/business-partners/PartnerFormDialog'
import { usePermission } from '@/hooks/usePermissions'
import { formatCurrency } from '@/utils/format'
import { brand } from '@/theme/theme'
import type { BusinessPartner } from '@/types/models'

export function BusinessPartnersPage() {
  const navigate = useNavigate()
  const { can } = usePermission('business_partners')
  const [formOpen, setFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['business-partners'],
    queryFn: () => listBusinessPartners(),
  })

  const filteredPartners = useMemo(
    () => partners.filter((p) => statusFilter === 'all' || p.status === statusFilter),
    [partners, statusFilter],
  )

  const totals = useMemo(() => {
    const activePartners = partners.filter((p) => p.status === 'active')
    const totalCapital = activePartners.reduce((sum, p) => sum + Number(p.current_capital_balance), 0)
    const totalLoans = activePartners.reduce((sum, p) => sum + Number(p.total_outstanding_loans), 0)
    const totalProfitShare = activePartners.reduce((sum, p) => sum + Number(p.current_profit_percentage ?? 0), 0)
    return { totalCapital, totalLoans, activeCount: activePartners.length, totalProfitShare }
  }, [partners])

  const showRatioWarning = totals.activeCount > 0 && Math.round(totals.totalProfitShare) !== 100

  const columns: DataTableColumn<BusinessPartner>[] = [
    {
      key: 'name',
      header: 'Partner Name',
      sortValue: (p) => p.name,
      render: (p) => (
        <Box>
          <Typography fontWeight={500} fontSize={13.5}>
            {p.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {p.phone ?? p.email ?? ''}
          </Typography>
        </Box>
      ),
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    {
      key: 'balance',
      header: 'Capital Balance',
      align: 'right',
      sortValue: (p) => Number(p.current_capital_balance),
      render: (p) => <Typography fontWeight={600}>{formatCurrency(p.current_capital_balance)}</Typography>,
    },
    {
      key: 'ratio',
      header: 'Profit / Loss %',
      align: 'right',
      render: (p) =>
        p.current_profit_percentage != null
          ? `${Number(p.current_profit_percentage)}% / ${Number(p.current_loss_percentage)}%`
          : 'Not set',
    },
    {
      key: 'drawings',
      header: 'Total Drawings',
      align: 'right',
      sortValue: (p) => Number(p.total_drawings),
      render: (p) => formatCurrency(p.total_drawings),
    },
    {
      key: 'loans',
      header: 'Outstanding Loans',
      align: 'right',
      sortValue: (p) => Number(p.total_outstanding_loans),
      render: (p) => formatCurrency(p.total_outstanding_loans),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Active Partners"
            value={String(totals.activeCount)}
            hint="Currently active business partners"
            icon={<GroupsIcon fontSize="small" />}
            color={brand.mint}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Total Capital Balance"
            value={formatCurrency(totals.totalCapital)}
            hint="Combined current capital account balance"
            icon={<AccountBalanceWalletIcon fontSize="small" />}
            color={brand.positive}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Outstanding Partner Loans"
            value={formatCurrency(totals.totalLoans)}
            hint="Loans owed back to partners"
            icon={<RequestQuoteIcon fontSize="small" />}
            color={brand.warning}
          />
        </Grid>
      </Grid>

      {showRatioWarning && (
        <Alert severity="warning">
          Active partners' profit-sharing percentages total {totals.totalProfitShare}%, not 100%. Review the
          Profit & Loss ratios on each partner.
        </Alert>
      )}

      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Business Partners
            </Typography>
            <Typography color="text.secondary">
              Manage partner identity, capital, profit sharing, and financial obligations.
            </Typography>
          </Box>
          {can('full') && (
            <Button variant="contained" onClick={() => setFormOpen(true)}>
              + Add Partner
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Stack>

        <DataTable
          columns={columns}
          rows={filteredPartners}
          getRowId={(p) => p.id}
          searchPlaceholder="Search by partner name…"
          searchPredicate={(p, q) => p.name.toLowerCase().includes(q)}
          onRowClick={(p) => navigate(`/business-partners/${p.id}`)}
          emptyMessage={isLoading ? 'Loading…' : 'No business partners yet'}
        />
      </Stack>

      <PartnerFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Stack>
  )
}
