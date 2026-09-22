import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Divider,
  Grid2 as Grid,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import dayjs from 'dayjs'
import {
  addBankAccount,
  addCustomField,
  collectOutstanding,
  deleteBankAccount,
  deleteCustomField,
  getVendor,
  sendVendorReminder,
  updateVendor,
} from '@/api/vendors'
import { listPayments } from '@/api/billing'
import { listCrateTransactions } from '@/api/crates'
import { listOrders } from '@/api/orders'
import { listProducts } from '@/api/products'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingScreen } from '@/components/LoadingScreen'
import { RecordsToolbar } from '@/components/RecordsToolbar'
import type { DateRangeValue } from '@/components/DateRangeFilter'
import { ALL_TIME_RANGE, isWithinDateRange } from '@/utils/dateRange'
import { VendorFormDialog } from '@/features/vendors/VendorFormDialog'
import { RecordVendorPaymentDialog } from '@/features/vendors/RecordVendorPaymentDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrency, formatCurrencyPrecise } from '@/utils/format'
import { exportRowsToExcel, exportRowsToPdf, printRows } from '@/utils/tableExport'
import type { LedgerEntry, Payment } from '@/types/models'

const TAB_LABELS = ['Profile', 'Party Ledger', 'Transactions', 'Item Wise Report', 'Crates'] as const

const VOUCHER_LABELS: Record<string, { label: string; badgeKey: string }> = {
  invoice: { label: 'Sale', badgeKey: 'sale' },
  payment: { label: 'Sale', badgeKey: 'sale' },
  adjustment: { label: 'Sale', badgeKey: 'sale' },
  purchase_invoice: { label: 'Purchase', badgeKey: 'purchase' },
  payment_out: { label: 'Purchase', badgeKey: 'purchase' },
  purchase_return: { label: 'Purchase', badgeKey: 'purchase' },
  debit_note: { label: 'Purchase', badgeKey: 'purchase' },
  opening_balance: { label: 'Opening Balance', badgeKey: 'adjustment' },
}

function voucherLabel(entryType: string): string {
  return VOUCHER_LABELS[entryType]?.label ?? entryType.replace(/_/g, ' ')
}

const emptyBankAccount = { account_holder_name: '', account_number: '', ifsc_code: '', bank_name: '' }
const emptyCustomField = { field_name: '', field_value: '' }

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="primary.main" fontWeight={500}>
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
      <Typography fontWeight={600} sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

export function VendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
  const { can } = usePermission('vendors')
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [txnMenuAnchor, setTxnMenuAnchor] = useState<HTMLElement | null>(null)
  const [newBankAccount, setNewBankAccount] = useState(emptyBankAccount)
  const [newCustomField, setNewCustomField] = useState(emptyCustomField)

  const [ledgerSearch, setLedgerSearch] = useState('')
  const [ledgerDateRange, setLedgerDateRange] = useState<DateRangeValue>(ALL_TIME_RANGE)
  const [txnSearch, setTxnSearch] = useState('')
  const [txnDateRange, setTxnDateRange] = useState<DateRangeValue>(ALL_TIME_RANGE)
  const [itemSearch, setItemSearch] = useState('')
  const [itemDateRange, setItemDateRange] = useState<DateRangeValue>(ALL_TIME_RANGE)
  const [crateSearch, setCrateSearch] = useState('')
  const [crateDateRange, setCrateDateRange] = useState<DateRangeValue>(ALL_TIME_RANGE)

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendors', vendorId],
    queryFn: () => getVendor(vendorId!),
    enabled: !!vendorId,
  })

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', vendorId],
    queryFn: () => listPayments(vendorId),
    enabled: !!vendorId && tab === 2,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'vendor', vendorId],
    queryFn: () => listOrders({ vendorId }),
    enabled: !!vendorId && tab === 3,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => listProducts(),
    enabled: tab === 3,
  })

  const { data: crateTxns = [] } = useQuery({
    queryKey: ['crates', 'transactions', vendorId],
    queryFn: () => listCrateTransactions(vendorId),
    enabled: !!vendorId && tab === 4,
  })

  const collect = useMutation({
    mutationFn: () => collectOutstanding(vendorId!),
    onSuccess: async () => {
      toast('Payment collected — account settled')
      await queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const remind = useMutation({
    mutationFn: () => sendVendorReminder(vendorId!),
    onSuccess: () => toast('WhatsApp reminder sent with UPI payment link'),
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const deactivate = useMutation({
    mutationFn: () => updateVendor(vendorId!, { is_active: false }),
    onSuccess: async () => {
      toast('Party deleted')
      await queryClient.invalidateQueries({ queryKey: ['vendors'] })
      navigate('/vendors')
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const addBankAccountMutation = useMutation({
    mutationFn: () => addBankAccount(vendorId!, newBankAccount),
    onSuccess: async () => {
      setNewBankAccount(emptyBankAccount)
      await queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const deleteBankAccountMutation = useMutation({
    mutationFn: (accountId: string) => deleteBankAccount(vendorId!, accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] }),
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const addCustomFieldMutation = useMutation({
    mutationFn: () => addCustomField(vendorId!, newCustomField),
    onSuccess: async () => {
      setNewCustomField(emptyCustomField)
      await queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const deleteCustomFieldMutation = useMutation({
    mutationFn: (fieldId: string) => deleteCustomField(vendorId!, fieldId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendors', vendorId] }),
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const allLedgerRows = useMemo(() => {
    if (!vendor) return []
    const ascending = [...vendor.ledger].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    let running = 0
    const withBalance = ascending.map((entry) => {
      running += Number(entry.debit) - Number(entry.credit)
      return { ...entry, balance: running }
    })
    return withBalance.reverse()
  }, [vendor])

  const ledgerRows = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase()
    return allLedgerRows.filter(
      (l) => isWithinDateRange(l.created_at, ledgerDateRange) && (!q || l.description.toLowerCase().includes(q)),
    )
  }, [allLedgerRows, ledgerSearch, ledgerDateRange])

  const filteredPayments = useMemo(() => {
    const q = txnSearch.trim().toLowerCase()
    return payments.filter(
      (p) =>
        isWithinDateRange(p.created_at, txnDateRange) &&
        (!q || p.method.toLowerCase().includes(q) || (p.reference ?? '').toLowerCase().includes(q)),
    )
  }, [payments, txnSearch, txnDateRange])

  const allItemWiseRows = useMemo(() => {
    if (products.length === 0) return []
    const productNames = new Map(products.map((p) => [p.id, p.name]))
    const totals = new Map<string, { quantity: number; value: number }>()
    for (const order of orders) {
      if (order.status === 'cancelled') continue
      if (!isWithinDateRange(order.created_at, itemDateRange)) continue
      for (const item of order.items) {
        const existing = totals.get(item.product_id) ?? { quantity: 0, value: 0 }
        existing.quantity += item.quantity
        existing.value += Number(item.line_total)
        totals.set(item.product_id, existing)
      }
    }
    return Array.from(totals.entries())
      .map(([productId, t]) => ({ productId, name: productNames.get(productId) ?? 'Unknown item', ...t }))
      .sort((a, b) => b.value - a.value)
  }, [orders, products, itemDateRange])

  const itemWiseRows = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    if (!q) return allItemWiseRows
    return allItemWiseRows.filter((r) => r.name.toLowerCase().includes(q))
  }, [allItemWiseRows, itemSearch])

  const allCrateRows = useMemo(
    () =>
      [...crateTxns]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((t) => ({
          ...t,
          given: t.txn_type === 'issue' ? t.quantity : 0,
          taken: t.txn_type !== 'issue' ? t.quantity : 0,
        })),
    [crateTxns],
  )

  const crateRows = useMemo(() => {
    const q = crateSearch.trim().toLowerCase()
    return allCrateRows.filter(
      (r) =>
        isWithinDateRange(r.created_at, crateDateRange) &&
        (!q || r.txn_type.toLowerCase().includes(q) || (r.note ?? '').toLowerCase().includes(q)),
    )
  }, [allCrateRows, crateSearch, crateDateRange])

  const crateTotals = useMemo(
    () => ({
      given: crateRows.reduce((sum, r) => sum + r.given, 0),
      taken: crateRows.reduce((sum, r) => sum + r.taken, 0),
    }),
    [crateRows],
  )

  if (isLoading || !vendor) return <LoadingScreen />

  const outstanding = Number(vendor.outstanding_balance)
  const totalBusiness = vendor.ledger.reduce((sum, l) => sum + Number(l.debit), 0)

  const ledgerColumns: DataTableColumn<LedgerEntry & { balance: number }>[] = [
    { key: 'date', header: 'Date', render: (l) => dayjs(l.created_at).format('DD/MM/YYYY') },
    {
      key: 'voucher',
      header: 'Voucher',
      render: (l) => {
        const voucher = VOUCHER_LABELS[l.entry_type] ?? { label: voucherLabel(l.entry_type), badgeKey: 'adjustment' }
        return <StatusBadge status={voucher.badgeKey} label={voucher.label} />
      },
    },
    { key: 'reference_number', header: 'Sr. No', render: (l) => l.reference_number ?? '-' },
    { key: 'credit', header: 'Credit', align: 'right', render: (l) => (Number(l.credit) > 0 ? formatCurrency(l.credit) : '-') },
    { key: 'debit', header: 'Debit', align: 'right', render: (l) => (Number(l.debit) > 0 ? formatCurrency(l.debit) : '-') },
    {
      key: 'tds_party',
      header: 'TDS Deducted by Party',
      align: 'right',
      render: (l) => (Number(l.tds_deducted_by_party) > 0 ? formatCurrency(l.tds_deducted_by_party) : '-'),
    },
    {
      key: 'tds_self',
      header: 'TDS Deducted by Self',
      align: 'right',
      render: (l) => (Number(l.tds_deducted_by_self) > 0 ? formatCurrency(l.tds_deducted_by_self) : '-'),
    },
    { key: 'status', header: 'Status', render: (l) => (l.status ? <StatusBadge status={l.status} /> : '-') },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (l) => (
        <Typography fontWeight={500} color={l.balance > 0 ? 'error.main' : l.balance < 0 ? 'success.main' : 'text.secondary'}>
          {formatCurrency(Math.abs(l.balance))}
        </Typography>
      ),
    },
  ]

  const paymentColumns: DataTableColumn<Payment>[] = [
    { key: 'date', header: 'Date', render: (p) => dayjs(p.created_at).format('DD/MM/YYYY') },
    { key: 'method', header: 'Method', render: (p) => <Box sx={{ textTransform: 'capitalize' }}>{p.method.replace(/_/g, ' ')}</Box> },
    { key: 'reference', header: 'Reference', render: (p) => p.reference ?? '-' },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatCurrency(p.amount) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  ]

  const itemColumns: DataTableColumn<(typeof itemWiseRows)[number]>[] = [
    { key: 'name', header: 'Item Name', sortValue: (r) => r.name, render: (r) => r.name },
    { key: 'quantity', header: 'Quantity', align: 'right', sortValue: (r) => r.quantity, render: (r) => r.quantity },
    { key: 'value', header: 'Value', align: 'right', sortValue: (r) => r.value, render: (r) => formatCurrency(r.value) },
  ]

  const crateColumns: DataTableColumn<(typeof crateRows)[number]>[] = [
    { key: 'date', header: 'Date', render: (r) => dayjs(r.created_at).format('DD/MM/YYYY') },
    { key: 'given', header: 'Given', align: 'right', render: (r) => (r.given > 0 ? <Typography color="success.main" fontWeight={500}>{r.given}</Typography> : '-') },
    { key: 'taken', header: 'Taken', align: 'right', render: (r) => (r.taken > 0 ? <Typography color="error.main" fontWeight={500}>{r.taken}</Typography> : '-') },
    { key: 'quantity', header: 'Quantity', align: 'right', render: (r) => r.quantity },
  ]

  return (
    <Stack spacing={0} sx={{ mx: -3.5, mt: -3.5 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1.5}
        sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/vendors')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography fontWeight={600} fontSize={17}>
              {vendor.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Vendor
            </Typography>
          </Box>
        </Stack>
        {can('full') && (
          <Stack direction="row" spacing={1}>
            <Button variant="contained" endIcon={<ExpandMoreIcon />} onClick={(e) => setTxnMenuAnchor(e.currentTarget)}>
              Record Transaction
            </Button>
            <Menu anchorEl={txnMenuAnchor} open={!!txnMenuAnchor} onClose={() => setTxnMenuAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setTxnMenuAnchor(null)
                  setPaymentDialogOpen(true)
                }}
              >
                <ListItemText primary="Record Payment" />
              </MenuItem>
              <MenuItem
                disabled={outstanding <= 0}
                onClick={() => {
                  setTxnMenuAnchor(null)
                  collect.mutate()
                }}
              >
                <ListItemText primary="Collect Full Outstanding" secondary={outstanding > 0 ? formatCurrency(outstanding) : undefined} />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setTxnMenuAnchor(null)
                  remind.mutate()
                }}
              >
                <ListItemText primary="Send Reminder" />
              </MenuItem>
            </Menu>
            <Button variant="outlined" startIcon={<EditIcon fontSize="small" />} onClick={() => setEditOpen(true)}>
              Edit Party
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon fontSize="small" />} onClick={() => setDeleteOpen(true)}>
              Delete Party
            </Button>
          </Stack>
        )}
      </Stack>

      <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {TAB_LABELS.map((label) => (
            <Tab key={label} label={label} sx={{ fontWeight: 500 }} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Stack spacing={2.5}>
            <SectionCard title="General Details">
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Party Name" value={vendor.name} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Party Type" value="Vendor" />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Mobile Number" value={vendor.phone} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Party Category" value={vendor.category ?? 'N/A'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Email" value={vendor.email ?? 'N/A'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Contact Person" value={vendor.contact_name} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Area / Route" value={`${vendor.area} / ${vendor.route}`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Credit Period" value={`${vendor.credit_period_days} days`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Credit Limit" value={formatCurrency(vendor.credit_limit)} />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="Business Details">
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="GSTIN" value={vendor.gstin ?? 'N/A'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="PAN Number" value={vendor.pan_number ?? 'N/A'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Billing Address"
                    value={
                      [vendor.billing_street, vendor.billing_city, vendor.billing_state, vendor.billing_pincode]
                        .filter(Boolean)
                        .join(', ') || 'N/A'
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Shipping Address"
                    value={
                      [vendor.shipping_street, vendor.shipping_city, vendor.shipping_state, vendor.shipping_pincode]
                        .filter(Boolean)
                        .join(', ') || 'N/A'
                    }
                  />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="Party Bank Details">
              {vendor.bank_accounts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  No bank accounts added for this party.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ mb: 1.5 }} divider={<Divider />}>
                  {vendor.bank_accounts.map((acc) => (
                    <Stack key={acc.id} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {acc.account_holder_name} · {acc.bank_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          A/C {acc.account_number} · {acc.ifsc_code}
                        </Typography>
                      </Box>
                      {can('full') && (
                        <IconButton size="small" color="error" onClick={() => deleteBankAccountMutation.mutate(acc.id)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}
              {can('full') && (
                <Grid container spacing={1.5} alignItems="center">
                  <Grid size={3}>
                    <TextField
                      size="small"
                      label="Account holder"
                      fullWidth
                      value={newBankAccount.account_holder_name}
                      onChange={(e) => setNewBankAccount((p) => ({ ...p, account_holder_name: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={3}>
                    <TextField
                      size="small"
                      label="Bank name"
                      fullWidth
                      value={newBankAccount.bank_name}
                      onChange={(e) => setNewBankAccount((p) => ({ ...p, bank_name: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={2.5}>
                    <TextField
                      size="small"
                      label="Account no."
                      fullWidth
                      value={newBankAccount.account_number}
                      onChange={(e) => setNewBankAccount((p) => ({ ...p, account_number: e.target.value }))}
                    />
                  </Grid>
                  <Grid size={2}>
                    <TextField
                      size="small"
                      label="IFSC"
                      fullWidth
                      value={newBankAccount.ifsc_code}
                      onChange={(e) => setNewBankAccount((p) => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))}
                    />
                  </Grid>
                  <Grid size={1.5}>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled={
                        addBankAccountMutation.isPending ||
                        !newBankAccount.account_holder_name ||
                        !newBankAccount.bank_name ||
                        newBankAccount.account_number.length < 4 ||
                        newBankAccount.ifsc_code.length !== 11
                      }
                      onClick={() => addBankAccountMutation.mutate()}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              )}
            </SectionCard>

            <SectionCard title="Custom Fields">
              {vendor.custom_fields.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  No custom fields added for this party.
                </Typography>
              ) : (
                <Stack spacing={1} sx={{ mb: 1.5 }} divider={<Divider />}>
                  {vendor.custom_fields.map((f) => (
                    <Stack key={f.id} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                        {f.field_name}: <Typography component="span" fontWeight={400}>{f.field_value}</Typography>
                      </Typography>
                      {can('full') && (
                        <IconButton size="small" color="error" onClick={() => deleteCustomFieldMutation.mutate(f.id)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}
              {can('full') && (
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    size="small"
                    label="Field name"
                    fullWidth
                    value={newCustomField.field_name}
                    onChange={(e) => setNewCustomField((p) => ({ ...p, field_name: e.target.value }))}
                  />
                  <TextField
                    size="small"
                    label="Value"
                    fullWidth
                    value={newCustomField.field_value}
                    onChange={(e) => setNewCustomField((p) => ({ ...p, field_value: e.target.value }))}
                  />
                  <Button
                    variant="outlined"
                    sx={{ whiteSpace: 'nowrap' }}
                    disabled={addCustomFieldMutation.isPending || !newCustomField.field_name || !newCustomField.field_value}
                    onClick={() => addCustomFieldMutation.mutate()}
                  >
                    + Add New Field
                  </Button>
                </Stack>
              )}
            </SectionCard>

            <SectionCard title="Financial Summary">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={500} color="text.secondary">
                      Total Business
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {formatCurrency(totalBusiness)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={500} color="text.secondary">
                      Balance
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color={outstanding > 0 ? 'error.main' : outstanding < 0 ? 'success.main' : 'text.primary'}>
                      {formatCurrency(Math.abs(outstanding))} {outstanding > 0 ? 'To Collect' : outstanding < 0 ? 'To Pay' : ''}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </SectionCard>
          </Stack>
        )}

        {tab === 1 && (
          <Box>
            <RecordsToolbar
              search={ledgerSearch}
              onSearchChange={setLedgerSearch}
              searchPlaceholder="Search transactions…"
              dateRange={ledgerDateRange}
              onDateRangeChange={setLedgerDateRange}
              onPrint={() =>
                printRows(
                  `Party Ledger — ${vendor.name}`,
                  'A summary of all ledger entries within the selected date range.',
                  ['Date', 'Voucher', 'Sr. No', 'Credit', 'Debit', 'TDS by Party', 'TDS by Self', 'Status', 'Balance'],
                  ledgerRows.map((l) => [
                    dayjs(l.created_at).format('DD/MM/YYYY'),
                    voucherLabel(l.entry_type),
                    l.reference_number ?? '-',
                    Number(l.credit) > 0 ? formatCurrencyPrecise(l.credit) : '-',
                    Number(l.debit) > 0 ? formatCurrencyPrecise(l.debit) : '-',
                    Number(l.tds_deducted_by_party) > 0 ? formatCurrencyPrecise(l.tds_deducted_by_party) : '-',
                    Number(l.tds_deducted_by_self) > 0 ? formatCurrencyPrecise(l.tds_deducted_by_self) : '-',
                    l.status ?? '-',
                    formatCurrencyPrecise(Math.abs(l.balance)),
                  ]),
                )
              }
              onDownloadPdf={() =>
                exportRowsToPdf(
                  `party-ledger-${vendor.name}`,
                  `Party Ledger — ${vendor.name}`,
                  'A summary of all ledger entries within the selected date range.',
                  ['Date', 'Voucher', 'Sr. No', 'Credit', 'Debit', 'TDS by Party', 'TDS by Self', 'Status', 'Balance'],
                  ledgerRows.map((l) => [
                    dayjs(l.created_at).format('DD/MM/YYYY'),
                    voucherLabel(l.entry_type),
                    l.reference_number ?? '-',
                    Number(l.credit) > 0 ? formatCurrencyPrecise(l.credit) : '-',
                    Number(l.debit) > 0 ? formatCurrencyPrecise(l.debit) : '-',
                    Number(l.tds_deducted_by_party) > 0 ? formatCurrencyPrecise(l.tds_deducted_by_party) : '-',
                    Number(l.tds_deducted_by_self) > 0 ? formatCurrencyPrecise(l.tds_deducted_by_self) : '-',
                    l.status ?? '-',
                    formatCurrencyPrecise(Math.abs(l.balance)),
                  ]),
                )
              }
              onDownloadExcel={() =>
                exportRowsToExcel(
                  `party-ledger-${vendor.name}`,
                  'Party Ledger',
                  ['Date', 'Voucher', 'Sr. No', 'Credit', 'Debit', 'TDS by Party', 'TDS by Self', 'Status', 'Balance'],
                  ledgerRows.map((l) => [
                    dayjs(l.created_at).format('DD/MM/YYYY'),
                    voucherLabel(l.entry_type),
                    l.reference_number ?? '-',
                    Number(l.credit),
                    Number(l.debit),
                    Number(l.tds_deducted_by_party),
                    Number(l.tds_deducted_by_self),
                    l.status ?? '-',
                    l.balance,
                  ]),
                )
              }
            />
            <DataTable
              columns={ledgerColumns}
              rows={ledgerRows}
              getRowId={(l) => l.id}
              emptyMessage="No ledger entries yet."
            />
          </Box>
        )}

        {tab === 2 && (
          <Box>
            <RecordsToolbar
              search={txnSearch}
              onSearchChange={setTxnSearch}
              searchPlaceholder="Search by method or reference…"
              dateRange={txnDateRange}
              onDateRangeChange={setTxnDateRange}
              onPrint={() =>
                printRows(
                  `Transactions — ${vendor.name}`,
                  'A summary of all payment transactions within the selected date range.',
                  ['Date', 'Method', 'Reference', 'Amount', 'Status'],
                  filteredPayments.map((p) => [
                    dayjs(p.created_at).format('DD/MM/YYYY'),
                    p.method.replace(/_/g, ' '),
                    p.reference ?? '-',
                    formatCurrencyPrecise(p.amount),
                    p.status,
                  ]),
                )
              }
              onDownloadPdf={() =>
                exportRowsToPdf(
                  `transactions-${vendor.name}`,
                  `Transactions — ${vendor.name}`,
                  'A summary of all payment transactions within the selected date range.',
                  ['Date', 'Method', 'Reference', 'Amount', 'Status'],
                  filteredPayments.map((p) => [
                    dayjs(p.created_at).format('DD/MM/YYYY'),
                    p.method.replace(/_/g, ' '),
                    p.reference ?? '-',
                    formatCurrencyPrecise(p.amount),
                    p.status,
                  ]),
                )
              }
              onDownloadExcel={() =>
                exportRowsToExcel(`transactions-${vendor.name}`, 'Transactions', ['Date', 'Method', 'Reference', 'Amount', 'Status'], filteredPayments.map((p) => [
                  dayjs(p.created_at).format('DD/MM/YYYY'),
                  p.method.replace(/_/g, ' '),
                  p.reference ?? '-',
                  Number(p.amount),
                  p.status,
                ]))
              }
            />
            <DataTable
              columns={paymentColumns}
              rows={filteredPayments}
              getRowId={(p) => p.id}
              emptyMessage="No transactions found."
            />
          </Box>
        )}

        {tab === 3 && (
          <Box>
            <RecordsToolbar
              search={itemSearch}
              onSearchChange={setItemSearch}
              searchPlaceholder="Search by item name…"
              dateRange={itemDateRange}
              onDateRangeChange={setItemDateRange}
              onPrint={() =>
                printRows(
                  `Item Wise Report — ${vendor.name}`,
                  'A summary of all items ordered within the selected date range.',
                  ['Item Name', 'Quantity', 'Value'],
                  itemWiseRows.map((r) => [r.name, r.quantity, formatCurrencyPrecise(r.value)]),
                )
              }
              onDownloadPdf={() =>
                exportRowsToPdf(
                  `item-wise-report-${vendor.name}`,
                  `Item Wise Report — ${vendor.name}`,
                  'A summary of all items ordered within the selected date range.',
                  ['Item Name', 'Quantity', 'Value'],
                  itemWiseRows.map((r) => [r.name, r.quantity, formatCurrencyPrecise(r.value)]),
                )
              }
              onDownloadExcel={() =>
                exportRowsToExcel(`item-wise-report-${vendor.name}`, 'Item Wise Report', ['Item Name', 'Quantity', 'Value'], itemWiseRows.map((r) => [
                  r.name,
                  r.quantity,
                  r.value,
                ]))
              }
            />
            <DataTable
              columns={itemColumns}
              rows={itemWiseRows}
              getRowId={(r) => r.productId}
              emptyMessage="No items ordered by this vendor yet."
            />
          </Box>
        )}

        {tab === 4 && (
          <Box>
            <RecordsToolbar
              search={crateSearch}
              onSearchChange={setCrateSearch}
              searchPlaceholder="Search by type or note…"
              dateRange={crateDateRange}
              onDateRangeChange={setCrateDateRange}
              onPrint={() =>
                printRows(
                  `Crates — ${vendor.name}`,
                  'A summary of all crate transactions within the selected date range.',
                  ['Date', 'Given', 'Taken', 'Quantity'],
                  crateRows.map((r) => [dayjs(r.created_at).format('DD/MM/YYYY'), r.given || '-', r.taken || '-', r.quantity]),
                )
              }
              onDownloadPdf={() =>
                exportRowsToPdf(
                  `crates-${vendor.name}`,
                  `Crates — ${vendor.name}`,
                  'A summary of all crate transactions within the selected date range.',
                  ['Date', 'Given', 'Taken', 'Quantity'],
                  crateRows.map((r) => [dayjs(r.created_at).format('DD/MM/YYYY'), r.given || '-', r.taken || '-', r.quantity]),
                )
              }
              onDownloadExcel={() =>
                exportRowsToExcel(`crates-${vendor.name}`, 'Crates', ['Date', 'Given', 'Taken', 'Quantity'], crateRows.map((r) => [
                  dayjs(r.created_at).format('DD/MM/YYYY'),
                  r.given,
                  r.taken,
                  r.quantity,
                ]))
              }
            />
            <Stack spacing={1.5}>
              <DataTable columns={crateColumns} rows={crateRows} getRowId={(r) => r.id} emptyMessage="No crate transactions yet." />
              <Stack direction="row" justifyContent="flex-end" spacing={4} sx={{ px: 2 }}>
                <Typography fontWeight={500}>
                  Total Given: <Typography component="span" color="success.main" fontWeight={600}>{crateTotals.given}</Typography>
                </Typography>
                <Typography fontWeight={500}>
                  Total Taken: <Typography component="span" color="error.main" fontWeight={600}>{crateTotals.taken}</Typography>
                </Typography>
                <Typography fontWeight={500}>
                  Net Balance: <Typography component="span" fontWeight={600}>{crateTotals.given - crateTotals.taken}</Typography>
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}
      </Box>

      <VendorFormDialog open={editOpen} onClose={() => setEditOpen(false)} vendor={vendor} />
      <RecordVendorPaymentDialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} vendorId={vendor.id} />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete party?"
        description={`This removes ${vendor.name} from your active party list. Existing orders, invoices, and ledger history are kept.`}
        confirmLabel="Delete"
        loading={deactivate.isPending}
        onConfirm={() => deactivate.mutate()}
        onClose={() => setDeleteOpen(false)}
      />
    </Stack>
  )
}
