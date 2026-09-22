import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Collapse,
  Grid2 as Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardIcon from '@mui/icons-material/KeyboardAltOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorIcon from '@mui/icons-material/ErrorOutlineOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PrintIcon from '@mui/icons-material/Print'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import GridOnIcon from '@mui/icons-material/GridOnOutlined'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { listPurchaseInvoices } from '@/api/purchases'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { StatCard } from '@/components/StatCard'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { PurchaseDocumentSettingsDialog } from '@/features/purchases/PurchaseDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { formatCurrency, formatCurrencyPrecise } from '@/utils/format'
import { exportRowsToExcel, exportRowsToPdf, printRows } from '@/utils/tableExport'
import { isWithinDateRange, type DateRangeValue } from '@/utils/dateRange'
import type { PurchaseInvoice } from '@/types/models'

export function PurchaseInvoicesPage() {
  const navigate = useNavigate()
  const { can } = usePermission('purchases')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: 'last_365_days', start: dayjs().subtract(365, 'day').startOf('day'), end: dayjs().endOf('day') })
  const [reportsAnchor, setReportsAnchor] = useState<HTMLElement | null>(null)
  const [keyboardAnchor, setKeyboardAnchor] = useState<HTMLElement | null>(null)
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; invoice: PurchaseInvoice } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['purchase-invoices'], queryFn: () => listPurchaseInvoices() })

  const dateAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((i) => {
      if (!isWithinDateRange(i.invoice_date, dateRange)) return false
      if (!q) return true
      return i.invoice_number.toLowerCase().includes(q) || i.vendor_name.toLowerCase().includes(q)
    })
  }, [invoices, search, dateRange])

  const totals = useMemo(() => {
    const total = dateAndSearchFiltered.reduce((sum, i) => sum + Number(i.total_amount), 0)
    const paid = dateAndSearchFiltered.reduce((sum, i) => sum + Number(i.amount_paid), 0)
    return { total, paid, unpaid: total - paid }
  }, [dateAndSearchFiltered])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return dateAndSearchFiltered
    return dateAndSearchFiltered.filter((i) => {
      const unpaid = Number(i.total_amount) - Number(i.amount_paid)
      return statusFilter === 'paid' ? unpaid <= 0 : unpaid > 0
    })
  }, [dateAndSearchFiltered, statusFilter])

  const dueIn = (invoice: PurchaseInvoice): string => {
    if (!invoice.due_date) return '-'
    const days = dayjs(invoice.due_date).startOf('day').diff(dayjs().startOf('day'), 'day')
    if (days < 0) return `${Math.abs(days)} Days overdue`
    if (days === 0) return 'Due today'
    return `${days} Days`
  }

  const runReport = (kind: 'print' | 'pdf' | 'excel') => {
    setReportsAnchor(null)
    const headers = ['Date', 'Invoice #', 'Party Name', 'Amount', 'Unpaid', 'Status']
    const rows = filtered.map((i) => [
      i.invoice_date,
      i.invoice_number,
      i.vendor_name,
      Number(i.total_amount),
      Number(i.total_amount) - Number(i.amount_paid),
      i.status,
    ])
    if (kind === 'print') printRows('Purchase Invoices', dateRangeSubtitle(dateRange), headers, rows)
    if (kind === 'pdf') exportRowsToPdf('purchase-invoices', 'Purchase Invoices', dateRangeSubtitle(dateRange), headers, rows)
    if (kind === 'excel') exportRowsToExcel('purchase-invoices', 'Purchase Invoices', headers, rows)
  }

  const columns: DataTableColumn<PurchaseInvoice>[] = [
    { key: 'date', header: 'Date', sortValue: (i) => i.invoice_date, render: (i) => i.invoice_date },
    {
      key: 'invoice_number',
      header: 'Purchase Invoice Number',
      sortValue: (i) => i.invoice_number,
      render: (i) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {i.invoice_number}
        </Typography>
      ),
    },
    { key: 'vendor', header: 'Party Name', sortValue: (i) => i.vendor_name, render: (i) => <Typography fontWeight={500} fontSize={13}>{i.vendor_name}</Typography> },
    { key: 'due_in', header: 'Due In', render: (i) => dueIn(i) },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (i) => Number(i.total_amount),
      render: (i) => {
        const unpaid = Number(i.total_amount) - Number(i.amount_paid)
        return (
          <Box>
            <Typography fontWeight={500} fontSize={13}>
              {formatCurrency(i.total_amount)}
            </Typography>
            {unpaid > 0 && (
              <Typography variant="caption" color="text.secondary">
                ({formatCurrency(unpaid)} unpaid)
              </Typography>
            )}
          </Box>
        )
      },
    },
    { key: 'status', header: 'Status', render: (i) => (Number(i.total_amount) > 0 ? <StatusBadge status={i.status} /> : null) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      hideable: false,
      render: (i) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            setRowMenu({ anchor: e.currentTarget, invoice: i })
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Purchase Invoices
          </Typography>
          <Typography color="text.secondary">Bills recorded against your suppliers.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" endIcon={<ExpandMoreIcon />} onClick={(e) => setReportsAnchor(e.currentTarget)}>
            Reports
          </Button>
          <Menu anchorEl={reportsAnchor} open={!!reportsAnchor} onClose={() => setReportsAnchor(null)}>
            <MenuItem onClick={() => runReport('print')}>
              <PrintIcon fontSize="small" sx={{ mr: 1 }} /> Print
            </MenuItem>
            <MenuItem onClick={() => runReport('pdf')}>
              <PictureAsPdfIcon fontSize="small" sx={{ mr: 1 }} /> Download as PDF
            </MenuItem>
            <MenuItem onClick={() => runReport('excel')}>
              <GridOnIcon fontSize="small" sx={{ mr: 1 }} /> Download as Excel
            </MenuItem>
          </Menu>
          <Tooltip title="Quick Purchase Invoice Settings">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Keyboard shortcuts">
            <IconButton onClick={(e) => setKeyboardAnchor(e.currentTarget)}>
              <KeyboardIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={keyboardAnchor} open={!!keyboardAnchor} onClose={() => setKeyboardAnchor(null)}>
            <MenuItem disabled>Search invoices — click the search icon</MenuItem>
            <MenuItem disabled>Sort a column — click its header</MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Total Purchases"
            value={formatCurrencyPrecise(totals.total)}
            icon={<ShoppingCartIcon fontSize="small" />}
            accentColor="primary.main"
            selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Paid"
            value={formatCurrencyPrecise(totals.paid)}
            icon={<CheckCircleIcon fontSize="small" />}
            accentColor="success.main"
            selected={statusFilter === 'paid'}
            onClick={() => setStatusFilter((f) => (f === 'paid' ? 'all' : 'paid'))}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Unpaid"
            value={formatCurrencyPrecise(totals.unpaid)}
            icon={<ErrorIcon fontSize="small" />}
            accentColor="error.main"
            selected={statusFilter === 'unpaid'}
            onClick={() => setStatusFilter((f) => (f === 'unpaid' ? 'all' : 'unpaid'))}
          />
        </Grid>
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={() => setSearchOpen((o) => !o)}>
            <SearchIcon />
          </IconButton>
          <Collapse in={searchOpen} orientation="horizontal">
            <TextField
              size="small"
              autoFocus
              placeholder="Search by invoice # or party…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 260 }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
          </Collapse>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </Stack>
        {can('full') && (
          <Button variant="contained" onClick={() => navigate('/purchases/invoices/new')}>
            Create Purchase Invoice
          </Button>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(i) => i.id}
        onRowClick={(i) => navigate(`/purchases/invoices/${i.id}`)}
        emptyMessage={isLoading ? 'Loading…' : 'No purchase invoices yet'}
      />

      <Menu anchorEl={rowMenu?.anchor ?? null} open={!!rowMenu} onClose={() => setRowMenu(null)}>
        <MenuItem
          onClick={() => {
            navigate(`/purchases/invoices/${rowMenu!.invoice.id}`)
            setRowMenu(null)
          }}
        >
          View Details
        </MenuItem>
        {can('full') && (
          <MenuItem
            disabled={Number(rowMenu?.invoice.total_amount) - Number(rowMenu?.invoice.amount_paid) <= 0}
            onClick={() => {
              const invoice = rowMenu!.invoice
              setRowMenu(null)
              navigate('/purchases/payments-out/new', {
                state: {
                  vendorId: invoice.vendor_id,
                  invoiceId: invoice.id,
                  amount: Number(invoice.total_amount) - Number(invoice.amount_paid),
                },
              })
            }}
          >
            Record Payment
          </MenuItem>
        )}
      </Menu>

      <PurchaseDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="purchase_invoice"
        title="Quick Purchase Invoice Settings"
      />
    </Stack>
  )
}

function dateRangeSubtitle(range: DateRangeValue): string {
  if (range.preset === 'all_time' || !range.start || !range.end) return 'All time'
  return `${range.start.format('MMM D, YYYY')} - ${range.end.format('MMM D, YYYY')}`
}
