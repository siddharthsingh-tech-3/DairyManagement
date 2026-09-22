import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import KeyboardIcon from '@mui/icons-material/KeyboardAltOutlined'
import dayjs from 'dayjs'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { GenerateEInvoiceChoiceModal } from '@/features/eInvoicing/GenerateEInvoiceChoiceModal'
import { downloadEInvoicePdf } from '@/features/eInvoicing/downloadEInvoicePdf'
import { getEInvoiceRecord, type EInvoiceStatus, type EInvoiceTxnType } from '@/features/eInvoicing/eInvoiceStorage'
import { useEInvoiceTransactions, type EInvoiceTransaction } from '@/features/eInvoicing/useEInvoiceTransactions'
import { useToastStore } from '@/store/uiStore'
import { formatCurrency } from '@/utils/format'
import { isWithinDateRange, type DateRangeValue } from '@/utils/dateRange'

const TYPE_FILTERS: { value: 'all' | EInvoiceTxnType; label: string }[] = [
  { value: 'all', label: 'All Transactions' },
  { value: 'sales_invoice', label: 'Sales' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'sales_return', label: 'Sales Return' },
  { value: 'debit_note', label: 'Debit Note' },
]

const STATUS_FILTERS: { value: 'all' | EInvoiceStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'yet_to_be_pushed', label: 'Yet To Be Pushed' },
  { value: 'generated', label: 'Generated' },
]

export function EInvoicingPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const { transactions, isLoading } = useEInvoiceTransactions()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMode, setSearchMode] = useState<'invoice_party' | 'mobile'>('invoice_party')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'last_365_days',
    start: dayjs().subtract(365, 'day').startOf('day'),
    end: dayjs().endOf('day'),
  })
  const [typeFilter, setTypeFilter] = useState<'all' | EInvoiceTxnType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | EInvoiceStatus>('all')
  const [choiceTxn, setChoiceTxn] = useState<EInvoiceTransaction | null>(null)
  const [keyboardAnchor, setKeyboardAnchor] = useState<HTMLElement | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions.filter((t) => {
      if (!isWithinDateRange(t.date, dateRange)) return false
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      const status = getEInvoiceRecord(t.type, t.id)?.status ?? 'yet_to_be_pushed'
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (q) {
        if (searchMode === 'mobile') {
          if (!t.partyPhone.toLowerCase().includes(q)) return false
        } else if (!t.number.toLowerCase().includes(q) && !t.partyName.toLowerCase().includes(q)) {
          return false
        }
      }
      return true
    })
  }, [transactions, dateRange, typeFilter, statusFilter, search, searchMode])

  const columns: DataTableColumn<EInvoiceTransaction>[] = [
    { key: 'date', header: 'Date', sortValue: (t) => t.date, render: (t) => dayjs(t.date).format('DD MMM YYYY') },
    {
      key: 'number',
      header: 'Transaction Number',
      sortValue: (t) => t.number,
      render: (t) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {t.number}
        </Typography>
      ),
    },
    { key: 'type', header: 'Type', sortValue: (t) => t.typeLabel, render: (t) => t.typeLabel },
    { key: 'party', header: 'Party Name', sortValue: (t) => t.partyName, render: (t) => <Typography fontWeight={500} fontSize={13}>{t.partyName}</Typography> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (t) => t.totalAmount,
      render: (t) => (
        <Box>
          <Typography fontWeight={500} fontSize={13}>
            {formatCurrency(t.totalAmount)}
          </Typography>
          {t.unpaidAmount > 0 && (
            <Typography variant="caption" color="text.secondary">
              ({formatCurrency(t.unpaidAmount)} unpaid)
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'E-Invoice Status',
      render: (t) => {
        const status = getEInvoiceRecord(t.type, t.id)?.status ?? 'yet_to_be_pushed'
        return <StatusBadge status={status} />
      },
    },
    {
      key: 'ack_number',
      header: 'Ack Number',
      render: (t) => getEInvoiceRecord(t.type, t.id)?.ackNumber ?? '-',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      hideable: false,
      render: (t) => {
        const record = getEInvoiceRecord(t.type, t.id)
        if (record?.status === 'generated') {
          return (
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation()
                downloadEInvoicePdf(t, record)
              }}
            >
              Download e-Invoice
            </Button>
          )
        }
        return (
          <Button
            size="small"
            variant="contained"
            onClick={(e) => {
              e.stopPropagation()
              setChoiceTxn(t)
            }}
          >
            Generate e-Invoice
          </Button>
        )
      },
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Typography variant="h5" fontWeight={600}>
          E-invoicing
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="E-invoicing settings">
            <IconButton onClick={() => toast('E-invoicing settings are not available yet', 'info')}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Keyboard shortcuts">
            <IconButton onClick={(e) => setKeyboardAnchor(e.currentTarget)}>
              <KeyboardIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={keyboardAnchor} open={!!keyboardAnchor} onClose={() => setKeyboardAnchor(null)}>
            <MenuItem disabled>Search transactions — click the search icon</MenuItem>
            <MenuItem disabled>Sort a column — click its header</MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5}>
        {searchOpen ? (
          <Stack direction="row" spacing={1.5}>
            <TextField
              size="small"
              autoFocus
              placeholder="Search Transactions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 220 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchOpen(false)
                          setSearch('')
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              size="small"
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as 'invoice_party' | 'mobile')}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="invoice_party">Invoice No. &amp; Party name</MenuItem>
              <MenuItem value="mobile">Mobile Number</MenuItem>
            </TextField>
          </Stack>
        ) : (
          <IconButton onClick={() => setSearchOpen(true)}>
            <SearchIcon />
          </IconButton>
        )}
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <TextField select size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | EInvoiceTxnType)} sx={{ minWidth: 170 }}>
          {TYPE_FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | EInvoiceStatus)} sx={{ minWidth: 150 }}>
          {STATUS_FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(t) => `${t.type}:${t.id}`}
        emptyMessage={isLoading ? 'Loading…' : 'No transactions yet'}
      />

      <GenerateEInvoiceChoiceModal
        open={!!choiceTxn}
        onClose={() => setChoiceTxn(null)}
        onChoose={(withEwayBill) => {
          const txn = choiceTxn
          setChoiceTxn(null)
          if (!txn) return
          navigate(`/e-invoicing/generate/${txn.type}/${txn.id}`, { state: { withEwayBill } })
        }}
      />
    </Stack>
  )
}
