import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Divider,
  Grid2 as Grid,
  IconButton,
  InputAdornment,
  ListItemText,
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
import SellIcon from '@mui/icons-material/SellOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorIcon from '@mui/icons-material/ErrorOutlineOutlined'
import CancelIcon from '@mui/icons-material/CancelOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PrintIcon from '@mui/icons-material/Print'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import GridOnIcon from '@mui/icons-material/GridOnOutlined'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { listSalesInvoices } from '@/api/sales'
import { listVendors } from '@/api/vendors'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { StatCard } from '@/components/StatCard'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { SalesDocumentSettingsDialog } from '@/features/sales/SalesDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { formatCurrency, formatCurrencyPrecise } from '@/utils/format'
import { exportRowsToExcel, exportRowsToPdf, printRows } from '@/utils/tableExport'
import { isWithinDateRange, type DateRangeValue } from '@/utils/dateRange'
import type { SalesInvoice } from '@/types/models'

const SEARCH_MODES = [
  { key: 'invoice_party', label: 'Invoice No. & Party name' },
  { key: 'mobile', label: 'Mobile Number' },
] as const

type SearchMode = (typeof SEARCH_MODES)[number]['key']

export function SalesInvoicesPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const { can } = usePermission('sales')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('invoice_party')
  const [searchModeAnchor, setSearchModeAnchor] = useState<HTMLElement | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeValue>({ preset: 'last_365_days', start: dayjs().subtract(365, 'day').startOf('day'), end: dayjs().endOf('day') })
  const [reportsAnchor, setReportsAnchor] = useState<HTMLElement | null>(null)
  const [bulkAnchor, setBulkAnchor] = useState<HTMLElement | null>(null)
  const [keyboardAnchor, setKeyboardAnchor] = useState<HTMLElement | null>(null)
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; invoice: SalesInvoice } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'cancelled'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['sales-invoices'], queryFn: () => listSalesInvoices() })
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors() })
  const vendorPhoneById = useMemo(() => new Map(vendors.map((v) => [v.id, v.phone])), [vendors])

  const dateAndSearchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((i) => {
      if (!isWithinDateRange(i.invoice_date, dateRange)) return false
      if (!q) return true
      if (searchMode === 'mobile') {
        const digits = q.replace(/\D/g, '')
        if (!digits) return false
        return (vendorPhoneById.get(i.vendor_id) ?? '').replace(/\D/g, '').includes(digits)
      }
      return i.invoice_number.toLowerCase().includes(q) || i.vendor_name.toLowerCase().includes(q)
    })
  }, [invoices, search, searchMode, dateRange, vendorPhoneById])

  const totals = useMemo(() => {
    const active = dateAndSearchFiltered.filter((i) => i.status !== 'cancelled')
    const total = active.reduce((sum, i) => sum + Number(i.total_amount), 0)
    const paid = active.reduce((sum, i) => sum + Number(i.amount_paid), 0)
    const cancelled = dateAndSearchFiltered
      .filter((i) => i.status === 'cancelled')
      .reduce((sum, i) => sum + Number(i.total_amount), 0)
    return { total, paid, unpaid: total - paid, cancelled }
  }, [dateAndSearchFiltered])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return dateAndSearchFiltered
    if (statusFilter === 'cancelled') return dateAndSearchFiltered.filter((i) => i.status === 'cancelled')
    return dateAndSearchFiltered.filter((i) => {
      if (i.status === 'cancelled') return false
      const unpaid = Number(i.total_amount) - Number(i.amount_paid)
      return statusFilter === 'paid' ? unpaid <= 0 : unpaid > 0
    })
  }, [dateAndSearchFiltered, statusFilter])

  const dueIn = (invoice: SalesInvoice): string => {
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
    if (kind === 'print') printRows('Sales Invoices', dateRangeSubtitle(dateRange), headers, rows)
    if (kind === 'pdf') exportRowsToPdf('sales-invoices', 'Sales Invoices', dateRangeSubtitle(dateRange), headers, rows)
    if (kind === 'excel') exportRowsToExcel('sales-invoices', 'Sales Invoices', headers, rows)
  }

  const runBulkExport = () => {
    setBulkAnchor(null)
    const selected = filtered.filter((i) => selectedIds.includes(i.id))
    if (selected.length === 0) {
      toast('Select at least one invoice first', 'error')
      return
    }
    const headers = ['Date', 'Invoice #', 'Party Name', 'Amount', 'Unpaid', 'Status']
    const rows = selected.map((i) => [
      i.invoice_date,
      i.invoice_number,
      i.vendor_name,
      Number(i.total_amount),
      Number(i.total_amount) - Number(i.amount_paid),
      i.status,
    ])
    exportRowsToExcel('sales-invoices-selected', 'Sales Invoices', headers, rows)
  }

  const runBulkReminder = () => {
    setBulkAnchor(null)
    if (selectedIds.length === 0) {
      toast('Select at least one invoice first', 'error')
      return
    }
    toast(`Reminder queued for ${selectedIds.length} invoice(s)`)
  }

  const columns: DataTableColumn<SalesInvoice>[] = [
    { key: 'date', header: 'Date', sortValue: (i) => i.invoice_date, render: (i) => i.invoice_date },
    {
      key: 'invoice_number',
      header: 'Invoice Number',
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
            {i.status !== 'cancelled' && unpaid > 0 && (
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
            Sales Invoices
          </Typography>
          <Typography color="text.secondary">Invoices raised against your customers.</Typography>
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
          <Tooltip title="Quick Sales Invoice Settings">
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
            <MenuItem disabled>Search invoices — type in the search box</MenuItem>
            <MenuItem disabled>Sort a column — click its header</MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            label="Total Sales"
            value={formatCurrencyPrecise(totals.total)}
            icon={<SellIcon fontSize="small" />}
            accentColor="primary.main"
            selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            label="Paid"
            value={formatCurrencyPrecise(totals.paid)}
            icon={<CheckCircleIcon fontSize="small" />}
            accentColor="success.main"
            selected={statusFilter === 'paid'}
            onClick={() => setStatusFilter((f) => (f === 'paid' ? 'all' : 'paid'))}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            label="Unpaid"
            value={formatCurrencyPrecise(totals.unpaid)}
            icon={<ErrorIcon fontSize="small" />}
            accentColor="error.main"
            selected={statusFilter === 'unpaid'}
            onClick={() => setStatusFilter((f) => (f === 'unpaid' ? 'all' : 'unpaid'))}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <StatCard
            label="Cancelled"
            value={formatCurrencyPrecise(totals.cancelled)}
            icon={<CancelIcon fontSize="small" />}
            accentColor="text.secondary"
            selected={statusFilter === 'cancelled'}
            onClick={() => setStatusFilter((f) => (f === 'cancelled' ? 'all' : 'cancelled'))}
          />
        </Grid>
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <TextField
            size="small"
            placeholder="Search Sales Invoice"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 240 }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setSearchModeAnchor(e.currentTarget)}
            endIcon={<ExpandMoreIcon fontSize="small" />}
            sx={{ width: 165, justifyContent: 'space-between', textTransform: 'none', color: 'text.primary', borderColor: 'divider', fontWeight: 400 }}
          >
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {SEARCH_MODES.find((m) => m.key === searchMode)?.label}
            </Box>
          </Button>
          <Menu anchorEl={searchModeAnchor} open={!!searchModeAnchor} onClose={() => setSearchModeAnchor(null)}>
            {SEARCH_MODES.map((m) => (
              <MenuItem
                key={m.key}
                selected={m.key === searchMode}
                onClick={() => {
                  setSearchMode(m.key)
                  setSearchModeAnchor(null)
                }}
              >
                {m.label}
              </MenuItem>
            ))}
          </Menu>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" endIcon={<ExpandMoreIcon />} onClick={(e) => setBulkAnchor(e.currentTarget)}>
            Bulk Actions
          </Button>
          <Menu anchorEl={bulkAnchor} open={!!bulkAnchor} onClose={() => setBulkAnchor(null)}>
            <MenuItem onClick={runBulkExport}>
              <ListItemText primary="Export selected to Excel" secondary={`${selectedIds.length} selected`} />
            </MenuItem>
            <Divider />
            <MenuItem onClick={runBulkReminder}>
              <ListItemText primary="Send payment reminder to selected" />
            </MenuItem>
          </Menu>
          {can('full') && (
            <Button variant="contained" onClick={() => navigate('/sales/invoices/new')}>
              Create Sales Invoice
            </Button>
          )}
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(i) => i.id}
        onRowClick={(i) => navigate(`/sales/invoices/${i.id}`)}
        emptyMessage={isLoading ? 'Loading…' : 'No sales invoices yet'}
        selectable
        selected={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <Menu anchorEl={rowMenu?.anchor ?? null} open={!!rowMenu} onClose={() => setRowMenu(null)}>
        <MenuItem
          onClick={() => {
            navigate(`/sales/invoices/${rowMenu!.invoice.id}`)
            setRowMenu(null)
          }}
        >
          View Details
        </MenuItem>
        {can('full') && (
          <MenuItem
            disabled={rowMenu?.invoice.status === 'cancelled' || Number(rowMenu?.invoice.total_amount) - Number(rowMenu?.invoice.amount_paid) <= 0}
            onClick={() => {
              const invoice = rowMenu!.invoice
              setRowMenu(null)
              navigate('/sales/payments-in/new', {
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

      <SalesDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="sales_invoice"
        title="Quick Sales Invoice Settings"
      />
    </Stack>
  )
}

function dateRangeSubtitle(range: DateRangeValue): string {
  if (range.preset === 'all_time' || !range.start || !range.end) return 'All time'
  return `${range.start.format('MMM D, YYYY')} - ${range.end.format('MMM D, YYYY')}`
}
