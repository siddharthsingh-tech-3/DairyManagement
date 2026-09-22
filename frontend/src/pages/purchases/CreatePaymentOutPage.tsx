import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import KeyboardAltOutlinedIcon from '@mui/icons-material/KeyboardAltOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SearchIcon from '@mui/icons-material/Search'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createPaymentOut, listPurchaseInvoices } from '@/api/purchases'
import { listVendors } from '@/api/vendors'
import { listSettings } from '@/api/settings'
import { VendorFormDialog } from '@/features/vendors/VendorFormDialog'
import { PurchaseDocumentSettingsDialog } from '@/features/purchases/PurchaseDocumentSettingsDialog'
import { DateRangeFilter, type DateRangeValue } from '@/components/DateRangeFilter'
import { ALL_TIME_RANGE, isWithinDateRange } from '@/utils/dateRange'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrencyPrecise } from '@/utils/format'
import type { PaymentMethod } from '@/types/enums'
import type { PurchaseInvoice, Vendor } from '@/types/models'

interface RowState {
  checked: boolean
  amountPaid: number
  discount: number
  discountEditing: boolean
}

function emptyRow(): RowState {
  return { checked: false, amountPaid: 0, discount: 0, discountEditing: false }
}

const ADD_NEW_VENDOR: Vendor = { id: '__add_new__' } as Vendor

export function CreatePaymentOutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const navState = (location.state as { vendorId?: string; invoiceId?: string; amount?: number } | null) ?? null

  const [vendorId, setVendorId] = useState(navState?.vendorId ?? '')
  const [addVendorOpen, setAddVendorOpen] = useState(false)
  const [paymentDate, setPaymentDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [amountPaid, setAmountPaid] = useState(navState?.amount ?? 0)
  const [paymentDiscount, setPaymentDiscount] = useState(0)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRangeValue>(ALL_TIME_RANGE)

  const [prefix, setPrefix] = useState('')
  const [number, setNumber] = useState('')
  const numberEditedRef = useRef(false)
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: listSettings })
  useEffect(() => {
    if (numberEditedRef.current || !settingsData) return
    const find = (key: string) => settingsData.find((s) => s.key === key)?.value
    setPrefix(find('payment_out_prefix') ?? 'PAY-OUT-')
    setNumber(find('payment_out_seq') ?? '1')
  }, [settingsData])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')

  const { data: suppliers = [] } = useQuery({ queryKey: ['vendors', 'suppliers'], queryFn: () => listVendors(undefined, true) })
  const selectedVendor = suppliers.find((v) => v.id === vendorId) ?? null

  const { data: invoices = [] } = useQuery({
    queryKey: ['purchase-invoices', vendorId],
    queryFn: () => listPurchaseInvoices(vendorId),
    enabled: !!vendorId,
  })

  const invoiceRow = (invoiceId: string) => rows[invoiceId] ?? emptyRow()

  useEffect(() => {
    if (!navState?.invoiceId) return
    const invoiceId = navState.invoiceId
    setRows({ [invoiceId]: { checked: true, amountPaid: navState.amount ?? 0, discount: 0, discountEditing: false } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Amount Paid up top always mirrors what's been applied to the checked invoices below —
   * selecting/editing a row's amount is what drives the total, not the other way round. */
  const syncAmountPaid = (nextRows: Record<string, RowState>) => {
    setAmountPaid(Object.values(nextRows).reduce((s, r) => (r.checked ? s + r.amountPaid : s), 0))
  }

  const setRow = (invoiceId: string, patch: Partial<RowState>) => {
    const next = { ...rows, [invoiceId]: { ...invoiceRow(invoiceId), ...patch } }
    setRows(next)
    syncAmountPaid(next)
  }

  const toggleRow = (invoice: PurchaseInvoice) => {
    const pending = Number(invoice.total_amount) - Number(invoice.amount_paid)
    const current = invoiceRow(invoice.id)
    const next = {
      ...rows,
      [invoice.id]: current.checked
        ? { checked: false, amountPaid: 0, discount: 0, discountEditing: false }
        : { ...current, checked: true, amountPaid: pending },
    }
    setRows(next)
    syncAmountPaid(next)
  }

  const visibleInvoices = invoices.filter((inv) => {
    if (search.trim() && !inv.invoice_number.toLowerCase().includes(search.trim().toLowerCase())) return false
    if (!isWithinDateRange(inv.invoice_date, dateRange)) return false
    return true
  })

  const totals = invoices.reduce(
    (acc, inv) => {
      const row = invoiceRow(inv.id)
      if (!row.checked) return acc
      return {
        invoiceAmount: acc.invoiceAmount + Number(inv.total_amount),
        discount: acc.discount + row.discount,
        amountPaid: acc.amountPaid + row.amountPaid,
      }
    },
    { invoiceAmount: 0, discount: 0, amountPaid: 0 },
  )

  const selectedCount = Object.values(rows).filter((r) => r.checked).length
  const clearSelection = () => {
    setRows({})
    setAmountPaid(0)
  }

  const allChecked = visibleInvoices.length > 0 && visibleInvoices.every((inv) => invoiceRow(inv.id).checked)

  const toggleAll = () => {
    const next = { ...rows }
    if (allChecked) {
      visibleInvoices.forEach((inv) => {
        next[inv.id] = { checked: false, amountPaid: 0, discount: 0, discountEditing: false }
      })
    } else {
      visibleInvoices.forEach((inv) => {
        const pending = Number(inv.total_amount) - Number(inv.amount_paid)
        next[inv.id] = { ...invoiceRow(inv.id), checked: true, amountPaid: pending }
      })
    }
    setRows(next)
    syncAmountPaid(next)
  }

  const mutation = useMutation({
    mutationFn: () => {
      const trimmedPrefix = prefix.trim()
      const trimmedNumber = number.trim()
      const allocations = Object.entries(rows)
        .filter(([, r]) => r.checked && (r.amountPaid > 0 || r.discount > 0))
        .map(([purchase_invoice_id, r]) => ({ purchase_invoice_id, amount: r.amountPaid, discount: r.discount }))
      return createPaymentOut({
        vendor_id: vendorId,
        payment_number: numberEditedRef.current && trimmedPrefix && trimmedNumber ? `${trimmedPrefix}${trimmedNumber}` : undefined,
        amount: amountPaid,
        discount_amount: paymentDiscount,
        payment_date: paymentDate,
        method: paymentMode,
        notes: notes || null,
        allocations,
      })
    },
    onSuccess: async () => {
      toast('Payment out recorded')
      await queryClient.invalidateQueries({ queryKey: ['payments-out'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      navigate('/purchases/payments-out')
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const handleSave = () => {
    if (!vendorId) {
      setError('Select a party to pay')
      return
    }
    if (!(amountPaid > 0)) {
      setError('Enter an amount paid')
      return
    }
    const allocatedTotal = Object.values(rows).reduce((s, r) => (r.checked ? s + r.amountPaid + r.discount : s), 0)
    if (allocatedTotal > amountPaid + paymentDiscount) {
      setError('Allocated amount across invoices exceeds the amount paid plus discount')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate('/purchases/payments-out')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Record Payment Out{number ? ` #${number}` : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Keyboard shortcuts">
          <IconButton>
            <KeyboardAltOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Button variant="outlined" startIcon={<SettingsOutlinedIcon />} onClick={() => setSettingsOpen(true)}>
          Settings
        </Button>
        <Button variant="outlined" color="inherit" onClick={() => navigate('/purchases/payments-out')}>
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSave}>
          Save
        </Button>
      </Stack>

      {error && (
        <Typography color="error" fontWeight={600}>
          {error}
        </Typography>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={0.5}>
                <Typography color="text.secondary" fontSize={13}>
                  Party Name
                </Typography>
                <Autocomplete
                  options={[...suppliers, ADD_NEW_VENDOR]}
                  value={selectedVendor}
                  getOptionLabel={(v) => (v.id === '__add_new__' ? '' : v.name)}
                  filterOptions={(options, state) => {
                    const q = state.inputValue.trim().toLowerCase()
                    const matches = options.filter(
                      (v) => v.id === '__add_new__' || v.name.toLowerCase().includes(q) || v.phone?.includes(q),
                    )
                    return matches
                  }}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, value) => {
                    if (!value) {
                      setVendorId('')
                      return
                    }
                    if (value.id === '__add_new__') {
                      setAddVendorOpen(true)
                      return
                    }
                    setVendorId(value.id)
                  }}
                  renderOption={(props, option) =>
                    option.id === '__add_new__' ? (
                      <MenuItem {...props} key="__add_new__" sx={{ color: 'primary.main', fontWeight: 500 }}>
                        <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                        Create Party
                      </MenuItem>
                    ) : (
                      <MenuItem {...props} key={option.id}>
                        {option.name}
                      </MenuItem>
                    )
                  }
                  renderInput={(params) => <TextField {...params} placeholder="Search party by name or number" />}
                />
                {selectedVendor && (
                  <Typography fontSize={13} color="text.secondary" sx={{ mt: 0.5 }}>
                    Current Balance:{' '}
                    <Typography component="span" fontWeight={500} fontSize={13} color="text.primary">
                      {formatCurrencyPrecise(selectedVendor.outstanding_balance)}
                    </Typography>
                  </Typography>
                )}
              </Stack>

              <Grid container spacing={2} sx={{ mt: 1.5 }}>
                <Grid size={6}>
                  <TextField
                    label="Amount Paid"
                    type="number"
                    fullWidth
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <span>Payment Out Discount</span>
                        <Tooltip title="An overall discount recorded against this payment, separate from any per-invoice discount applied below.">
                          <InfoOutlinedIcon sx={{ fontSize: 15 }} />
                        </Tooltip>
                      </Stack>
                    }
                    type="number"
                    fullWidth
                    value={paymentDiscount}
                    onChange={(e) => setPaymentDiscount(Number(e.target.value))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={4}>
                  <TextField
                    label="Payment Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField select label="Payment Mode" fullWidth value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMethod)}>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="bank">Bank</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="cod">Cash on Delivery</MenuItem>
                    <MenuItem value="pay_later">Pay Later</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Payment Out Prefix"
                    fullWidth
                    value={prefix}
                    onChange={(e) => {
                      numberEditedRef.current = true
                      setPrefix(e.target.value)
                    }}
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    label="Payment Out Number"
                    fullWidth
                    value={number}
                    onChange={(e) => {
                      numberEditedRef.current = true
                      setNumber(e.target.value)
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Notes"
                    placeholder="Enter Notes"
                    fullWidth
                    multiline
                    minRows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {vendorId && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography fontWeight={600}>Settle invoices with this payment</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {selectedCount > 0 && (
                  <Chip
                    label={`${selectedCount} Invoice${selectedCount > 1 ? 's' : ''} Selected`}
                    onDelete={clearSelection}
                    variant="outlined"
                    color="primary"
                  />
                )}
                {searchOpen ? (
                  <TextField
                    size="small"
                    autoFocus
                    placeholder="Search invoice #"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onBlur={() => !search && setSearchOpen(false)}
                  />
                ) : (
                  <IconButton onClick={() => setSearchOpen(true)}>
                    <SearchIcon />
                  </IconButton>
                )}
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
              </Stack>
            </Stack>

            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox checked={allChecked} indeterminate={!allChecked && visibleInvoices.some((i) => invoiceRow(i.id).checked)} onChange={toggleAll} />
                    </TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Invoice #</TableCell>
                    <TableCell align="right">Invoice Amount</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Amount Paid</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No invoices for this party
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleInvoices.map((inv) => {
                    const pending = Number(inv.total_amount) - Number(inv.amount_paid)
                    const row = invoiceRow(inv.id)
                    return (
                      <TableRow key={inv.id} selected={row.checked}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={row.checked} onChange={() => toggleRow(inv)} />
                        </TableCell>
                        <TableCell>{dayjs(inv.invoice_date).format('DD MMM YYYY')}</TableCell>
                        <TableCell>{inv.due_date ? dayjs(inv.due_date).format('DD MMM YYYY') : '—'}</TableCell>
                        <TableCell>
                          <Typography color="primary.main" fontWeight={500} fontSize={13}>
                            {inv.invoice_number}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrencyPrecise(inv.total_amount)}
                          {pending > 0 && !row.checked && (
                            <Typography component="span" color="error.main" fontSize={12} sx={{ ml: 0.5 }}>
                              ({formatCurrencyPrecise(pending)} pending)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {row.discountEditing ? (
                            <TextField
                              size="small"
                              type="number"
                              autoFocus
                              value={row.discount}
                              onChange={(e) => setRow(inv.id, { discount: Number(e.target.value), checked: true })}
                              onBlur={() => setRow(inv.id, { discountEditing: false })}
                              sx={{ width: 100 }}
                              slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
                            />
                          ) : row.discount > 0 ? (
                            <Typography
                              component="span"
                              fontSize={13}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => setRow(inv.id, { discountEditing: true })}
                            >
                              {formatCurrencyPrecise(row.discount)}
                            </Typography>
                          ) : (
                            <Typography
                              component="span"
                              color="primary.main"
                              fontSize={12.5}
                              fontWeight={500}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => setRow(inv.id, { discountEditing: true })}
                            >
                              Apply Discount
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={row.amountPaid}
                            onChange={(e) => setRow(inv.id, { amountPaid: Number(e.target.value), checked: true })}
                            sx={{ width: 110 }}
                            slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                {visibleInvoices.length > 0 && (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography fontWeight={600}>Total</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>{formatCurrencyPrecise(totals.invoiceAmount)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>{formatCurrencyPrecise(totals.discount)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>{formatCurrencyPrecise(totals.amountPaid)}</Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </TableContainer>
            {amountPaid > 0 && (
              <Typography fontSize={12.5} color={amountPaid < totals.amountPaid ? 'error.main' : 'text.secondary'} sx={{ mt: 1 }}>
                {amountPaid > totals.amountPaid
                  ? `${formatCurrencyPrecise(amountPaid - totals.amountPaid)} of the amount paid is not yet applied to an invoice.`
                  : amountPaid < totals.amountPaid
                    ? `Selected invoices are settling ${formatCurrencyPrecise(totals.amountPaid - amountPaid)} more than the amount paid.`
                    : 'Full amount paid has been applied to the selected invoices.'}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <PurchaseDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="payment_out"
        title="Quick Payment Out Settings"
        showToggles={false}
        showPriceHistory={false}
      />
      <VendorFormDialog
        open={addVendorOpen}
        onClose={async () => {
          setAddVendorOpen(false)
          await queryClient.invalidateQueries({ queryKey: ['vendors', 'suppliers'] })
        }}
        defaultIsSupplier
      />
    </Stack>
  )
}
