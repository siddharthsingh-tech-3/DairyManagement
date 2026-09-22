import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import dayjs from 'dayjs'
import { listExpenses } from '@/api/expenses'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ExpenseCategorySelect } from '@/features/expenses/ExpenseCategorySelect'
import { useToastStore } from '@/store/uiStore'
import { formatCurrency, formatCurrencyPrecise } from '@/utils/format'
import { isFavourite, setFavourite } from '@/utils/reportFavourites'
import { isWithinDateRange, type DateRangeValue } from '@/utils/dateRange'
import { exportRowsToExcel, exportRowsToPdf } from '@/utils/tableExport'
import { brand } from '@/theme/theme'

const REPORT_SLUG = 'expense-transaction-report'

export function ExpenseTransactionReportPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)

  const [favourite, setFavouriteState] = useState(() => isFavourite(REPORT_SLUG))
  const [category, setCategory] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'this_month',
    start: dayjs().startOf('month'),
    end: dayjs().endOf('month'),
  })

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => listExpenses() })

  const rows = useMemo(
    () =>
      expenses
        .filter((e) => isWithinDateRange(e.expense_date, dateRange))
        .filter((e) => !category || e.category === category)
        .sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1)),
    [expenses, dateRange, category],
  )

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount), 0), [rows])

  const toggleFavourite = () => {
    setFavouriteState((prev) => {
      setFavourite(REPORT_SLUG, !prev)
      return !prev
    })
  }

  const subtitle = dateRange.preset === 'all_time' || !dateRange.start || !dateRange.end
    ? 'All time'
    : `${dateRange.start.format('MMM D, YYYY')} - ${dateRange.end.format('MMM D, YYYY')}`

  const headers = ['Date', 'Expense Number', 'Party Name', 'Category', 'Payment Mode', 'Amount']
  const exportRows = () =>
    rows.map((r) => [r.expense_date, r.expense_number ?? '-', r.payee ?? '-', r.category, r.payment_mode ?? '-', Number(r.amount)])

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap gap={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/expenses')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" fontWeight={600}>
            Expense Transaction Report
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            icon={favourite ? <StarIcon sx={{ fontSize: 16, color: brand.warning }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
            label="Favourite"
            onClick={toggleFavourite}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<MailOutlineIcon />} onClick={() => toast('Email delivery is coming soon', 'info')}>
            Email Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => exportRowsToExcel('expense-transaction-report', 'Expense Transactions', headers, exportRows())}
          >
            Download Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintOutlinedIcon />}
            onClick={() => exportRowsToPdf('expense-transaction-report', 'Expense Transaction Report', subtitle, headers, exportRows())}
          >
            Print PDF
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <ExpenseCategorySelect
          value={category}
          onChange={setCategory}
          allowAll
          label=""
          fullWidth={false}
          sx={{ width: 220, flexShrink: 0 }}
        />
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </Stack>

      <Card variant="outlined">
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography component="span" fontWeight={500} color="text.secondary">
            Total Amount:{' '}
          </Typography>
          <Typography component="span" fontWeight={500} color="success.main">
            {formatCurrencyPrecise(total)}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Expense Number</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Payment Mode</TableCell>
                <TableCell align="right">Total Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {isLoading ? 'Loading…' : 'No expenses in this period'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.expense_date}</TableCell>
                  <TableCell>
                    <Typography color="primary" fontWeight={600} fontSize={13.5}>
                      {r.expense_number ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.payment_mode ?? '-'}</TableCell>
                  <TableCell align="right">{formatCurrency(r.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Stack>
  )
}
