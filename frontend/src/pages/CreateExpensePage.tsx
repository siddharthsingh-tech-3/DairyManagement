import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import KeyboardAltOutlinedIcon from '@mui/icons-material/KeyboardAltOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createExpense } from '@/api/expenses'
import { listSettings } from '@/api/settings'
import { ExpenseCategorySelect } from '@/features/expenses/ExpenseCategorySelect'
import { ExpenseDocumentSettingsDialog } from '@/features/expenses/ExpenseDocumentSettingsDialog'
import { ExpenseLineItemsTable, emptyExpenseLineItem, type ExpenseLineItemDraft } from '@/features/expenses/ExpenseLineItemsTable'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrencyPrecise } from '@/utils/format'

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card']

function initialFormState() {
  return {
    isGstApplicable: false,
    category: '' as string | null,
    originalInvoiceNumber: '',
    expenseDate: dayjs().format('YYYY-MM-DD'),
    paymentMode: 'Cash',
    partyName: '',
    note: '',
    items: [{ ...emptyExpenseLineItem }] as ExpenseLineItemDraft[],
  }
}

export function CreateExpensePage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [form, setForm] = useState(initialFormState)
  const set = <K extends keyof ReturnType<typeof initialFormState>>(key: K, value: ReturnType<typeof initialFormState>[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const [expensePrefix, setExpensePrefix] = useState('')
  const [expenseNo, setExpenseNo] = useState('')
  const expenseNumberEditedRef = useRef(false)
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: listSettings })
  useEffect(() => {
    if (expenseNumberEditedRef.current || !settingsData) return
    const find = (key: string) => settingsData.find((s) => s.key === key)?.value
    setExpensePrefix(find('expense_prefix') ?? 'EXP-')
    setExpenseNo(find('expense_seq') ?? '1')
  }, [settingsData])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')
  const saveModeRef = useRef<'save' | 'saveAndNew'>('save')

  const total = useMemo(
    () =>
      form.items.reduce((sum, i) => sum + i.amount * (1 + (form.isGstApplicable ? i.tax_percent : 0) / 100), 0),
    [form.items, form.isGstApplicable],
  )

  const mutation = useMutation({
    mutationFn: () => {
      const trimmedPrefix = expensePrefix.trim()
      const trimmedNo = expenseNo.trim()
      return createExpense({
        expense_number: trimmedPrefix && trimmedNo ? `${trimmedPrefix}${trimmedNo}` : undefined,
        category: form.category ?? '',
        expense_date: form.expenseDate,
        payee: form.partyName || null,
        payment_mode: form.paymentMode || null,
        original_invoice_number: form.originalInvoiceNumber || null,
        is_gst_applicable: form.isGstApplicable,
        note: form.note || null,
        items: form.items
          .filter((i) => i.description && i.amount > 0)
          .map((i) => ({
            description: i.description,
            amount: i.amount,
            tax_percent: form.isGstApplicable ? i.tax_percent : 0,
          })),
      })
    },
    onSuccess: async () => {
      toast('Expense saved')
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      if (saveModeRef.current === 'saveAndNew') {
        expenseNumberEditedRef.current = false
        setForm(initialFormState())
      } else {
        navigate('/expenses')
      }
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const handleSave = (mode: 'save' | 'saveAndNew') => {
    if (!form.category) {
      setError('Select an expense category')
      return
    }
    if (form.items.filter((i) => i.description && i.amount > 0).length === 0) {
      setError('Add at least one item with an amount')
      return
    }
    setError('')
    saveModeRef.current = mode
    mutation.mutate()
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate('/expenses')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Create Expense
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
        <Button variant="outlined" disabled={mutation.isPending} onClick={() => handleSave('saveAndNew')}>
          Save &amp; New
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={() => handleSave('save')}>
          Save
        </Button>
      </Stack>

      {error && (
        <Typography color="error" fontWeight={600}>
          {error}
        </Typography>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography fontWeight={500}>Expense With GST</Typography>
                <Switch checked={form.isGstApplicable} onChange={(e) => set('isGstApplicable', e.target.checked)} />
              </Stack>

              <Stack spacing={2}>
                <ExpenseCategorySelect value={form.category} onChange={(v) => set('category', v)} required />

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField
                      label="Expense Prefix"
                      fullWidth
                      value={expensePrefix}
                      onChange={(e) => {
                        expenseNumberEditedRef.current = true
                        setExpensePrefix(e.target.value)
                      }}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Expense Number"
                      fullWidth
                      value={expenseNo}
                      onChange={(e) => {
                        expenseNumberEditedRef.current = true
                        setExpenseNo(e.target.value)
                      }}
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Original Invoice Number"
                  fullWidth
                  value={form.originalInvoiceNumber}
                  onChange={(e) => set('originalInvoiceNumber', e.target.value)}
                />

                <TextField
                  label="Party Name"
                  fullWidth
                  value={form.partyName}
                  onChange={(e) => set('partyName', e.target.value)}
                />

                <TextField
                  label="Note"
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="Enter Notes"
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={form.expenseDate}
                  onChange={(e) => set('expenseDate', e.target.value)}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Payment Mode
                  </Typography>
                  <Select fullWidth value={form.paymentMode} onChange={(e) => set('paymentMode', e.target.value)}>
                    {PAYMENT_MODES.map((mode) => (
                      <MenuItem key={mode} value={mode}>
                        {mode}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card variant="outlined">
            <CardContent>
              <ExpenseLineItemsTable items={form.items} onChange={(items) => set('items', items)} showTax={form.isGstApplicable} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
            <Typography fontWeight={600}>Total Expense Amount</Typography>
            <TextField size="small" value={formatCurrencyPrecise(total)} disabled sx={{ width: 160 }} />
          </Stack>
        </Grid>
      </Grid>

      <ExpenseDocumentSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Stack>
  )
}
