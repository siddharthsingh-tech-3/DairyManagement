import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import EventIcon from '@mui/icons-material/Event'
import DownloadIcon from '@mui/icons-material/Download'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import dayjs from 'dayjs'
import { listInvoices } from '@/api/billing'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingScreen } from '@/components/LoadingScreen'
import { formatCurrencyPrecise } from '@/utils/format'
import { exportSalesReportToExcel, exportSalesReportToPdf } from '@/features/reports/exportSalesReport'
import { useToastStore } from '@/store/uiStore'
import type { InvoiceStatus } from '@/types/enums'

const DATE_RANGES = ['All Time', 'Today', 'This Week', 'This Month', 'This Year'] as const
type DateRange = (typeof DATE_RANGES)[number]

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'overdue', label: 'Overdue' },
]

export function SalesTransactionReportPage() {
  const toast = useToastStore((s) => s.show)
  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => listInvoices() })

  const [search, setSearch] = useState('')
  const [admin, setAdmin] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('All Time')
  const [status, setStatus] = useState('all')
  const [invoiceType, setInvoiceType] = useState('all')
  const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(null)

  const admins = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.created_by).filter((v): v is string => !!v))),
    [invoices],
  )

  const filtered = useMemo(() => {
    const now = dayjs()
    return invoices.filter((inv) => {
      if (search) {
        const q = search.toLowerCase()
        if (!inv.invoice_no.toLowerCase().includes(q) && !inv.vendor_name.toLowerCase().includes(q)) return false
      }
      if (admin !== 'all' && inv.created_by !== admin) return false
      if (status !== 'all' && inv.status !== status) return false
      if (invoiceType !== 'all' && inv.invoice_type !== invoiceType) return false
      if (dateRange !== 'All Time') {
        const d = dayjs(inv.created_at)
        if (dateRange === 'Today' && !d.isSame(now, 'day')) return false
        if (dateRange === 'This Week' && !d.isSame(now, 'week')) return false
        if (dateRange === 'This Month' && !d.isSame(now, 'month')) return false
        if (dateRange === 'This Year' && !d.isSame(now, 'year')) return false
      }
      return true
    })
  }, [invoices, search, admin, status, invoiceType, dateRange])

  const totalSales = filtered.reduce((s, i) => s + Number(i.total), 0)

  const handleExport = (format: 'excel' | 'pdf') => {
    setDownloadAnchor(null)
    if (filtered.length === 0) {
      toast('Nothing to export for the current filters')
      return
    }
    if (format === 'excel') {
      exportSalesReportToExcel(filtered, totalSales)
    } else {
      exportSalesReportToPdf(filtered, totalSales)
    }
    toast(`Sales report exported to ${format === 'excel' ? 'Excel' : 'PDF'}`)
  }

  if (isLoading) return <LoadingScreen />

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Sales Transaction Report
          </Typography>
          <Typography color="text.secondary">
            A summary of all sales transactions within the selected date range.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          endIcon={<ExpandMoreIcon />}
          onClick={(e) => setDownloadAnchor(e.currentTarget)}
        >
          Download
        </Button>
        <Menu anchorEl={downloadAnchor} open={!!downloadAnchor} onClose={() => setDownloadAnchor(null)}>
          <MenuItem onClick={() => handleExport('excel')}>Excel</MenuItem>
          <MenuItem onClick={() => handleExport('pdf')}>PDF</MenuItem>
        </Menu>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <TextField
                size="small"
                placeholder="Search by Invoice No or Party Name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 280, flex: 1 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                select
                size="small"
                value={admin}
                onChange={(e) => setAdmin(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="all">All Admin</MenuItem>
                {admins.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                sx={{ minWidth: 160 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EventIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              >
                {DATE_RANGES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="all">Invoice Status</MenuItem>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                select
                size="small"
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="all">Invoice Type</MenuItem>
                <MenuItem value="Credit">Credit</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
              </TextField>
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Invoice No.</TableCell>
                  <TableCell>Party Name</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Balance Amount</TableCell>
                  <TableCell>Invoice Type</TableCell>
                  <TableCell>Invoice Status</TableCell>
                  <TableCell>Created By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{dayjs(inv.created_at).format('DD/MM/YYYY')}</TableCell>
                    <TableCell sx={{ fontFamily: "'JetBrains Mono',monospace" }}>{inv.invoice_no}</TableCell>
                    <TableCell>{inv.vendor_name}</TableCell>
                    <TableCell>{dayjs(inv.due_date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell align="right">{formatCurrencyPrecise(inv.total)}</TableCell>
                    <TableCell align="right">
                      {formatCurrencyPrecise(Number(inv.total) - Number(inv.amount_paid))}
                    </TableCell>
                    <TableCell>{inv.invoice_type}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} label={inv.status === 'due' ? 'Unpaid' : undefined} />
                    </TableCell>
                    <TableCell>{inv.created_by ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={4} align="right">
                      <Typography fontWeight={600}>Total Sales</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>{formatCurrencyPrecise(totalSales)}</Typography>
                    </TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
