import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Grid2 as Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import dayjs from 'dayjs'
import { getFinancialSummary, getLatestTransactions, getSalesTrend } from '@/api/reports'
import { formatCurrency } from '@/utils/format'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingScreen } from '@/components/LoadingScreen'
import { brand, monoFontFamily } from '@/theme/theme'

interface FinancialStripColumn {
  label: string
  value: string
  rawValue: number
  caption: string
  onClick?: () => void
}

function FinancialStrip({ columns }: { columns: FinancialStripColumn[] }) {
  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ overflowX: 'auto' }}>
        {columns.map((col, i) => (
          <Box
            key={col.label}
            onClick={col.onClick}
            sx={{
              flex: '1 0 160px',
              minWidth: 160,
              px: 2,
              py: 1.75,
              borderRight: i < columns.length - 1 ? `1px solid ${brand.borderInner}` : 'none',
              cursor: col.onClick ? 'pointer' : 'default',
            }}
          >
            <Typography variant="caption" fontWeight={500} color="text.secondary">
              {col.label}
            </Typography>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 500,
                fontFamily: monoFontFamily,
                mt: 0.5,
                color: col.rawValue < 0 ? brand.negative : 'text.primary',
              }}
            >
              {col.value}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
              {col.caption}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Card>
  )
}

export function FinancialOverview() {
  const navigate = useNavigate()
  const { data: summary, isLoading } = useQuery({
    queryKey: ['reports', 'financial-summary'],
    queryFn: getFinancialSummary,
  })

  if (isLoading || !summary) return <LoadingScreen />

  return (
    <Stack spacing={2.5}>
      <FinancialStrip
        columns={[
          {
            label: 'To Collect',
            value: formatCurrency(summary.to_collect),
            rawValue: Number(summary.to_collect),
            caption: 'From unpaid invoices',
            onClick: () => navigate('/vendors'),
          },
          {
            label: 'To Pay',
            value: formatCurrency(summary.to_pay),
            rawValue: Number(summary.to_pay),
            caption: 'Pending expense payments',
            onClick: () => navigate('/vendors'),
          },
          {
            label: 'Total Revenue',
            value: formatCurrency(summary.total_revenue),
            rawValue: Number(summary.total_revenue),
            caption: 'From all sales invoices',
            onClick: () => navigate('/reports/sales-transactions'),
          },
          {
            label: 'Total Profit',
            value: formatCurrency(summary.total_profit),
            rawValue: Number(summary.total_profit),
            caption: 'Revenue minus expenses',
          },
          {
            label: 'Total Expenses',
            value: formatCurrency(summary.total_expenses),
            rawValue: Number(summary.total_expenses),
            caption: 'Fuel, salary, rent & more',
          },
          {
            label: 'Cash & Bank',
            value: formatCurrency(summary.cash_and_bank),
            rawValue: Number(summary.cash_and_bank),
            caption: 'Collected minus paid expenses',
          },
        ]}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SalesReportCard />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <LatestTransactionsCard />
        </Grid>
      </Grid>
    </Stack>
  )
}

function SalesReportCard() {
  const [start, setStart] = useState(dayjs().subtract(6, 'day').format('YYYY-MM-DD'))
  const [end, setEnd] = useState(dayjs().format('YYYY-MM-DD'))

  const { data: trend } = useQuery({
    queryKey: ['reports', 'sales-trend', start, end],
    queryFn: () => getSalesTrend(start, end),
  })

  const chartData = useMemo(
    () =>
      (trend?.points ?? []).map((p) => ({
        date: dayjs(p.date).format('D MMM'),
        amount: Number(p.amount),
      })),
    [trend],
  )

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography fontWeight={600}>Sales Report</Typography>
            <Typography variant="caption" color="text.secondary">
              Daily Sales · Invoices Made: {trend?.invoices_made ?? 0}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <TextField
              type="date"
              size="small"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              slotProps={{ htmlInput: { max: end } }}
            />
            <TextField
              type="date"
              size="small"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              slotProps={{ htmlInput: { min: start, max: dayjs().format('YYYY-MM-DD') } }}
            />
          </Stack>
        </Stack>
        <Box sx={{ height: 300 }}>
          {chartData.length === 0 ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                No delivered sales in this range yet.
              </Typography>
            </Stack>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={brand.borderInner} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" fill={brand.mint} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

function LatestTransactionsCard() {
  const { data: txns = [] } = useQuery({
    queryKey: ['reports', 'latest-transactions'],
    queryFn: () => getLatestTransactions(10),
  })

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={600} sx={{ mb: 1.5 }}>
          Latest Transactions
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Txn No</TableCell>
              <TableCell>Party</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {txns.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{dayjs(t.date).format('DD/MM/YYYY')}</TableCell>
                <TableCell>
                  <StatusBadge status={t.type.toLowerCase().includes('sale') ? 'confirmed' : 'draft'} label={t.type} />
                </TableCell>
                <TableCell sx={{ fontFamily: monoFontFamily }}>{t.txn_no}</TableCell>
                <TableCell>{t.party_name}</TableCell>
                <TableCell align="right">{formatCurrency(t.amount)}</TableCell>
              </TableRow>
            ))}
            {txns.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
