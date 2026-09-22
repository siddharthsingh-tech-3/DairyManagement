import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardIcon from '@mui/icons-material/KeyboardAltOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { deleteExpense, listExpenses } from '@/api/expenses'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExpenseCategorySelect } from '@/features/expenses/ExpenseCategorySelect'
import { ExpenseDocumentSettingsDialog } from '@/features/expenses/ExpenseDocumentSettingsDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrency } from '@/utils/format'
import { isWithinDateRange, type DateRangeValue } from '@/utils/dateRange'
import type { Expense } from '@/types/models'

export function ExpensesPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { can } = usePermission('expenses')

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('invoice_party')
  const [category, setCategory] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'last_365_days',
    start: dayjs().subtract(365, 'day').startOf('day'),
    end: dayjs().endOf('day'),
  })
  const [reportsAnchor, setReportsAnchor] = useState<HTMLElement | null>(null)
  const [keyboardAnchor, setKeyboardAnchor] = useState<HTMLElement | null>(null)
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; expense: Expense } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => listExpenses() })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses.filter((e) => {
      if (!isWithinDateRange(e.expense_date, dateRange)) return false
      if (category && e.category !== category) return false
      if (!q) return true
      return (e.expense_number ?? '').toLowerCase().includes(q) || (e.payee ?? '').toLowerCase().includes(q)
    })
  }, [expenses, search, dateRange, category])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast('Expense deleted')
      setDeleteTarget(null)
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const columns: DataTableColumn<Expense>[] = [
    { key: 'date', header: 'Date', sortValue: (e) => e.expense_date, render: (e) => e.expense_date },
    {
      key: 'expense_number',
      header: 'Expense Number',
      sortValue: (e) => e.expense_number ?? '',
      render: (e) => (
        <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
          {e.expense_number ?? '-'}
        </Typography>
      ),
    },
    { key: 'party', header: 'Party Name', sortValue: (e) => e.payee ?? '', render: (e) => e.payee ?? '-' },
    { key: 'category', header: 'Category', sortValue: (e) => e.category, render: (e) => e.category },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (e) => Number(e.amount),
      render: (e) => (
        <Typography fontWeight={500} fontSize={13}>
          {formatCurrency(e.amount)}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      hideable: false,
      render: (e) => (
        <IconButton
          size="small"
          onClick={(ev) => {
            ev.stopPropagation()
            setRowMenu({ anchor: ev.currentTarget, expense: e })
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
            Expenses
          </Typography>
          <Typography color="text.secondary">Money spent running the business.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" endIcon={<ExpandMoreIcon />} onClick={(e) => setReportsAnchor(e.currentTarget)}>
            Reports
          </Button>
          <Menu anchorEl={reportsAnchor} open={!!reportsAnchor} onClose={() => setReportsAnchor(null)}>
            <MenuItem
              onClick={() => {
                setReportsAnchor(null)
                navigate('/reports/expense-transaction-report')
              }}
            >
              Expense Transactions
            </MenuItem>
            <MenuItem
              onClick={() => {
                setReportsAnchor(null)
                navigate('/reports/expense-category-report')
              }}
            >
              Expense Category
            </MenuItem>
          </Menu>
          <Tooltip title="Quick Expense Settings">
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
            <MenuItem disabled>Search expenses — click the search icon</MenuItem>
            <MenuItem disabled>Sort a column — click its header</MenuItem>
          </Menu>
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              height: 40,
              flexShrink: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" alignItems="center" sx={{ pl: 1.5, pr: 1, color: 'text.secondary' }}>
              <SearchIcon fontSize="small" />
            </Stack>
            <InputBase
              placeholder="Search Expense"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: 14, width: 160 }}
            />
            <Divider orientation="vertical" flexItem />
            <Select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              variant="standard"
              disableUnderline
              sx={{ px: 1.5, fontSize: 13, bgcolor: 'action.hover', minWidth: 150 }}
            >
              <MenuItem value="invoice_party">Invoice No. & Party name</MenuItem>
              <MenuItem value="mobile_number">Mobile Number</MenuItem>
            </Select>
          </Box>
          <DateRangeFilter value={dateRange} onChange={setDateRange} sx={{ height: 40 }} />
          <ExpenseCategorySelect
            value={category}
            onChange={setCategory}
            allowAll
            label=""
            fullWidth={false}
            sx={{ width: 220, flexShrink: 0, '& .MuiInputBase-root': { height: 40 } }}
          />
        </Stack>
        {can('full') && (
          <Button variant="contained" onClick={() => navigate('/expenses/new')}>
            Create Expense
          </Button>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(e) => e.id}
        emptyMessage={isLoading ? 'Loading…' : 'No Transactions Matching the current filter'}
      />

      <Menu anchorEl={rowMenu?.anchor ?? null} open={!!rowMenu} onClose={() => setRowMenu(null)}>
        {can('full') && (
          <MenuItem
            onClick={() => {
              setDeleteTarget(rowMenu!.expense)
              setRowMenu(null)
            }}
          >
            Delete Expense
          </MenuItem>
        )}
      </Menu>

      <ExpenseDocumentSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete expense?"
        description={`This permanently removes expense ${deleteTarget?.expense_number ?? ''}.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deleteTarget!.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </Stack>
  )
}
