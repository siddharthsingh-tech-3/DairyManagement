import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Button, Grid2 as Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalanceOutlined'
import TrendingDownIcon from '@mui/icons-material/TrendingDownOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUpOutlined'
import { listLoans } from '@/api/loans'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { LoanFormDialog } from '@/features/loans/LoanFormDialog'
import { usePermission } from '@/hooks/usePermissions'
import { formatCurrency } from '@/utils/format'
import { brand } from '@/theme/theme'
import type { Loan } from '@/types/models'

export function LoansPage() {
  const navigate = useNavigate()
  const { can } = usePermission('loans')
  const [formOpen, setFormOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => listLoans(),
  })

  const filteredLoans = useMemo(
    () =>
      loans.filter((l) => {
        if (typeFilter !== 'all' && l.loan_type !== typeFilter) return false
        if (statusFilter !== 'all' && l.status !== statusFilter) return false
        if (fromDate && l.loan_date < fromDate) return false
        if (toDate && l.loan_date > toDate) return false
        return true
      }),
    [loans, typeFilter, statusFilter, fromDate, toDate],
  )

  const totals = useMemo(() => {
    const active = loans.filter((l) => l.status === 'active')
    const totalTaken = active.filter((l) => l.loan_type === 'taken').reduce((sum, l) => sum + Number(l.outstanding_principal) + Number(l.outstanding_interest), 0)
    const totalGiven = active.filter((l) => l.loan_type === 'given').reduce((sum, l) => sum + Number(l.outstanding_principal) + Number(l.outstanding_interest), 0)
    return { activeCount: active.length, totalTaken, totalGiven }
  }, [loans])

  const columns: DataTableColumn<Loan>[] = [
    {
      key: 'loan_number',
      header: 'Loan ID',
      sortValue: (l) => l.loan_number,
      render: (l) => (
        <Box>
          <Typography fontWeight={500} fontSize={13.5}>
            {l.loan_number}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {l.party_name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'loan_type',
      header: 'Type',
      render: (l) => <StatusBadge status={l.loan_type === 'taken' ? 'due' : 'active'} label={l.loan_type === 'taken' ? 'Taken' : 'Given'} />,
    },
    { key: 'loan_date', header: 'Loan Date', sortValue: (l) => l.loan_date, render: (l) => l.loan_date },
    {
      key: 'principal_amount',
      header: 'Principal',
      align: 'right',
      sortValue: (l) => Number(l.principal_amount),
      render: (l) => formatCurrency(l.principal_amount),
    },
    {
      key: 'interest_rate',
      header: 'Interest Rate',
      align: 'right',
      render: (l) => `${Number(l.interest_rate)}%`,
    },
    {
      key: 'outstanding_principal',
      header: 'Outstanding Principal',
      align: 'right',
      sortValue: (l) => Number(l.outstanding_principal),
      render: (l) => <Typography fontWeight={600}>{formatCurrency(l.outstanding_principal)}</Typography>,
    },
    {
      key: 'total_interest',
      header: 'Total Interest',
      align: 'right',
      sortValue: (l) => Number(l.total_interest),
      render: (l) => formatCurrency(l.total_interest),
    },
    {
      key: 'paid_amount',
      header: 'Paid Amount',
      align: 'right',
      sortValue: (l) => Number(l.paid_amount),
      render: (l) => formatCurrency(l.paid_amount),
    },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      sortValue: (l) => Number(l.outstanding_principal) + Number(l.outstanding_interest),
      render: (l) => formatCurrency(Number(l.outstanding_principal) + Number(l.outstanding_interest)),
    },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
  ]

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Active Loans"
            value={String(totals.activeCount)}
            hint="Loans currently active (taken + given)"
            icon={<AccountBalanceIcon fontSize="small" />}
            color={brand.mint}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Outstanding Loans Taken"
            value={formatCurrency(totals.totalTaken)}
            hint="Total payable — principal + interest"
            icon={<TrendingDownIcon fontSize="small" />}
            color={brand.warning}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Outstanding Loans Given"
            value={formatCurrency(totals.totalGiven)}
            hint="Total receivable — principal + interest"
            icon={<TrendingUpIcon fontSize="small" />}
            color={brand.positive}
          />
        </Grid>
      </Grid>

      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Loan Management
            </Typography>
            <Typography color="text.secondary">
              Track loans taken from and given to vendors, partners, banks, and other parties.
            </Typography>
          </Box>
          {can('full') && (
            <Button variant="contained" onClick={() => setFormOpen(true)}>
              + Add Loan
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Loan Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="taken">Loan Taken</MenuItem>
            <MenuItem value="given">Loan Given</MenuItem>
          </TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
            <MenuItem value="defaulted">Defaulted</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="From"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>

        <DataTable
          columns={columns}
          rows={filteredLoans}
          getRowId={(l) => l.id}
          searchPlaceholder="Search by loan ID or party name…"
          searchPredicate={(l, q) => l.loan_number.toLowerCase().includes(q) || l.party_name.toLowerCase().includes(q)}
          onRowClick={(l) => navigate(`/loans/${l.id}`)}
          emptyMessage={isLoading ? 'Loading…' : 'No loans recorded yet'}
        />
      </Stack>

      <LoanFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Stack>
  )
}
