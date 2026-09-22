import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
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
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createCreditNote, listSalesInvoices, listSalesReturns } from '@/api/sales'
import { listSettings } from '@/api/settings'
import { listProducts } from '@/api/products'
import { uploadFile } from '@/api/uploads'
import { CustomerSelectField } from '@/features/sales/CustomerSelectField'
import {
  PurchaseLineItemsTable,
  emptyLineItem,
  lineItemFromProduct,
  type PurchaseLineItemDraft,
} from '@/features/purchases/PurchaseLineItemsTable'
import { SalesDocumentSettingsDialog } from '@/features/sales/SalesDocumentSettingsDialog'
import { BarcodeScannerDialog } from '@/features/purchases/BarcodeScannerDialog'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrencyPrecise } from '@/utils/format'

function computeTotals(
  items: PurchaseLineItemDraft[],
  discountAmount: number,
  additionalCharges: number,
  tdsAmount: number,
  tcsAmount: number,
) {
  const subtotal = items.reduce((s, i) => s + i.rate * i.quantity, 0)
  const taxAmount = items.reduce((s, i) => s + (i.rate * i.quantity * i.tax_percent) / 100, 0)
  const beforeRoundOff = subtotal - discountAmount + additionalCharges + taxAmount - tdsAmount + tcsAmount
  const autoRoundOffValue = Math.round(beforeRoundOff) - beforeRoundOff
  return { subtotal, taxAmount, beforeRoundOff, autoRoundOffValue }
}

function initialFormState() {
  return {
    vendorId: '',
    salesInvoiceId: '',
    salesReturnId: '',
    noteDate: dayjs().format('YYYY-MM-DD'),
    paymentTermsEnabled: false,
    paymentTerms: '',
    items: [{ ...emptyLineItem }] as PurchaseLineItemDraft[],
    additionalChargesEnabled: false,
    additionalCharges: 0,
    discountEnabled: false,
    discountAmount: 0,
    tdsEnabled: false,
    tdsAmount: 0,
    tcsEnabled: false,
    tcsAmount: 0,
    autoRoundOff: true,
    roundOffDirection: 'add' as 'add' | 'subtract',
    manualRoundOffAmount: 0,
    amountPaid: 0,
    noteEnabled: false,
    notes: '',
    termsEnabled: false,
    termsAndConditions: '',
    signatoryName: '',
    signatureUrl: null as string | null,
  }
}

export function CreateCreditNotePage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [form, setForm] = useState(initialFormState)
  const set = <K extends keyof ReturnType<typeof initialFormState>>(key: K, value: ReturnType<typeof initialFormState>[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const [notePrefix, setNotePrefix] = useState('')
  const [noteNo, setNoteNo] = useState('')
  const noteNumberEditedRef = useRef(false)
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: listSettings })
  useEffect(() => {
    if (noteNumberEditedRef.current || !settingsData) return
    const find = (key: string) => settingsData.find((s) => s.key === key)?.value
    setNotePrefix(find('credit_note_prefix') ?? 'CN-')
    setNoteNo(find('credit_note_seq') ?? '1')
  }, [settingsData])

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const { data: invoices = [] } = useQuery({ queryKey: ['sales-invoices'], queryFn: () => listSalesInvoices() })
  const { data: returns = [] } = useQuery({ queryKey: ['sales-returns'], queryFn: () => listSalesReturns() })
  const vendorInvoices = invoices.filter((i) => i.vendor_id === form.vendorId)
  const vendorReturns = returns.filter((r) => r.vendor_id === form.vendorId)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveModeRef = useRef<'save' | 'saveAndNew'>('save')

  const base = useMemo(
    () =>
      computeTotals(
        form.items,
        form.discountEnabled ? form.discountAmount : 0,
        form.additionalChargesEnabled ? form.additionalCharges : 0,
        form.tdsEnabled ? form.tdsAmount : 0,
        form.tcsEnabled ? form.tcsAmount : 0,
      ),
    [form.items, form.discountEnabled, form.discountAmount, form.additionalChargesEnabled, form.additionalCharges, form.tdsEnabled, form.tdsAmount, form.tcsEnabled, form.tcsAmount],
  )
  const roundOff = form.autoRoundOff
    ? base.autoRoundOffValue
    : form.roundOffDirection === 'add'
      ? form.manualRoundOffAmount
      : -form.manualRoundOffAmount
  const total = base.beforeRoundOff + roundOff
  const balance = total - form.amountPaid

  const mutation = useMutation({
    mutationFn: () => {
      const trimmedPrefix = notePrefix.trim()
      const trimmedNo = noteNo.trim()
      return createCreditNote({
        vendor_id: form.vendorId,
        sales_invoice_id: form.salesInvoiceId || null,
        sales_return_id: form.salesReturnId || null,
        credit_note_number: trimmedPrefix && trimmedNo ? `${trimmedPrefix}${trimmedNo}` : undefined,
        note_date: form.noteDate,
        payment_terms: form.paymentTermsEnabled ? form.paymentTerms : null,
        notes: form.noteEnabled ? form.notes : null,
        terms_and_conditions: form.termsEnabled ? form.termsAndConditions : null,
        discount_amount: form.discountEnabled ? form.discountAmount : 0,
        additional_charges: form.additionalChargesEnabled ? form.additionalCharges : 0,
        tds_amount: form.tdsEnabled ? form.tdsAmount : 0,
        tcs_amount: form.tcsEnabled ? form.tcsAmount : 0,
        round_off: roundOff,
        amount_paid: form.amountPaid,
        authorized_signatory_name: form.signatoryName || null,
        authorized_signatory_signature_url: form.signatureUrl,
        items: form.items
          .filter((i) => i.description)
          .map((i) => ({
            product_id: i.product_id,
            description: i.description,
            hsn_code: i.hsn_code,
            quantity: i.quantity,
            rate: i.rate,
            tax_percent: i.tax_percent,
          })),
      })
    },
    onSuccess: async () => {
      toast('Credit note recorded')
      await queryClient.invalidateQueries({ queryKey: ['credit-notes'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      if (saveModeRef.current === 'saveAndNew') {
        noteNumberEditedRef.current = false
        setForm(initialFormState())
      } else {
        navigate('/sales/credit-notes')
      }
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const handleSave = (mode: 'save' | 'saveAndNew') => {
    if (!form.vendorId) {
      setError('Select a customer')
      return
    }
    if (form.items.filter((i) => i.description).length === 0) {
      setError('Add at least one line item')
      return
    }
    setError('')
    saveModeRef.current = mode
    mutation.mutate()
  }

  const handleSignatureFile = async (file: File) => {
    setUploadingSignature(true)
    try {
      const { url } = await uploadFile(file)
      set('signatureUrl', url)
    } catch (err) {
      toast(extractErrorMessage(err), 'error')
    } finally {
      setUploadingSignature(false)
    }
  }

  const handleBarcodeDetected = (value: string) => {
    const product = products.find((p) => p.sku === value)
    if (!product) {
      toast(`No product with barcode "${value}"`, 'error')
      return
    }
    set('items', [...form.items, lineItemFromProduct(product)])
    toast(`Added ${product.name}`)
    setScannerOpen(false)
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate('/sales/credit-notes')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Create Credit Note
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
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2.5}>
            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Customer Details
                </Typography>
                <CustomerSelectField value={form.vendorId} onChange={(v) => set('vendorId', v)} />
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Credit Note Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={4}>
                    <TextField
                      label="Note Prefix"
                      fullWidth
                      value={notePrefix}
                      onChange={(e) => {
                        noteNumberEditedRef.current = true
                        setNotePrefix(e.target.value)
                      }}
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      label="Note No."
                      fullWidth
                      value={noteNo}
                      onChange={(e) => {
                        noteNumberEditedRef.current = true
                        setNoteNo(e.target.value)
                      }}
                    />
                  </Grid>
                  <Grid size={4} />
                  <Grid size={4}>
                    <TextField
                      label="Note Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={form.noteDate}
                      onChange={(e) => set('noteDate', e.target.value)}
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      select
                      label="Against Sales Invoice"
                      fullWidth
                      value={form.salesInvoiceId}
                      onChange={(e) => set('salesInvoiceId', e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {vendorInvoices.map((inv) => (
                        <MenuItem key={inv.id} value={inv.id}>
                          {inv.invoice_number}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      select
                      label="Against Sales Return"
                      fullWidth
                      value={form.salesReturnId}
                      onChange={(e) => set('salesReturnId', e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      {vendorReturns.map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.return_number}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.paymentTermsEnabled}
                          onChange={(e) => set('paymentTermsEnabled', e.target.checked)}
                        />
                      }
                      label="Payment Terms"
                    />
                    {form.paymentTermsEnabled && (
                      <TextField
                        placeholder="e.g. Net 30"
                        size="small"
                        sx={{ ml: 2 }}
                        value={form.paymentTerms}
                        onChange={(e) => set('paymentTerms', e.target.value)}
                      />
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography fontWeight={600}>Line Items</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<QrCodeScannerIcon />}
                    onClick={() => setScannerOpen(true)}
                  >
                    Scan Barcode
                  </Button>
                </Stack>
                <PurchaseLineItemsTable items={form.items} onChange={(items) => set('items', items)} showDiscount={false} />
              </CardContent>
            </Card>

            <Grid container spacing={2.5}>
              <Grid size={6}>
                <FormControlLabel
                  control={<Switch checked={form.noteEnabled} onChange={(e) => set('noteEnabled', e.target.checked)} />}
                  label="Add Note"
                />
                {form.noteEnabled && (
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Note"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                )}
              </Grid>
              <Grid size={6}>
                <FormControlLabel
                  control={<Switch checked={form.termsEnabled} onChange={(e) => set('termsEnabled', e.target.checked)} />}
                  label="Add Terms and Conditions"
                />
                {form.termsEnabled && (
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Terms and conditions"
                    value={form.termsAndConditions}
                    onChange={(e) => set('termsAndConditions', e.target.value)}
                  />
                )}
              </Grid>
            </Grid>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2.5}>
            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Payment Summary
                </Typography>
                <Stack spacing={1.5}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.additionalChargesEnabled}
                        onChange={(e) => set('additionalChargesEnabled', e.target.checked)}
                      />
                    }
                    label="Add Additional Charges"
                  />
                  {form.additionalChargesEnabled && (
                    <TextField
                      label="Additional charges"
                      type="number"
                      size="small"
                      value={form.additionalCharges}
                      onChange={(e) => set('additionalCharges', Number(e.target.value))}
                    />
                  )}

                  <FormControlLabel
                    control={<Switch checked={form.discountEnabled} onChange={(e) => set('discountEnabled', e.target.checked)} />}
                    label="Add Discount"
                  />
                  {form.discountEnabled && (
                    <TextField
                      label="Discount amount"
                      type="number"
                      size="small"
                      value={form.discountAmount}
                      onChange={(e) => set('discountAmount', Number(e.target.value))}
                    />
                  )}

                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Taxable Amount</Typography>
                      <Typography fontWeight={500}>{formatCurrencyPrecise(base.subtotal)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Tax</Typography>
                      <Typography fontWeight={500}>{formatCurrencyPrecise(base.taxAmount)}</Typography>
                    </Stack>
                  </Box>

                  <FormControlLabel
                    control={<Switch checked={form.tdsEnabled} onChange={(e) => set('tdsEnabled', e.target.checked)} />}
                    label="TDS Deducted by Customer"
                  />
                  {form.tdsEnabled && (
                    <TextField
                      label="TDS amount"
                      type="number"
                      size="small"
                      value={form.tdsAmount}
                      onChange={(e) => set('tdsAmount', Number(e.target.value))}
                    />
                  )}
                  <FormControlLabel
                    control={<Switch checked={form.tcsEnabled} onChange={(e) => set('tcsEnabled', e.target.checked)} />}
                    label="Apply TCS"
                  />
                  {form.tcsEnabled && (
                    <TextField
                      label="TCS amount"
                      type="number"
                      size="small"
                      value={form.tcsAmount}
                      onChange={(e) => set('tcsAmount', Number(e.target.value))}
                    />
                  )}

                  <Stack direction="row" alignItems="center" spacing={1}>
                    <FormControlLabel
                      control={<Checkbox checked={form.autoRoundOff} onChange={(e) => set('autoRoundOff', e.target.checked)} />}
                      label="Auto Round Off"
                      sx={{ flex: 1 }}
                    />
                    <Select
                      size="small"
                      value={form.autoRoundOff ? (base.autoRoundOffValue < 0 ? 'subtract' : 'add') : form.roundOffDirection}
                      onChange={(e) => set('roundOffDirection', e.target.value as 'add' | 'subtract')}
                      disabled={form.autoRoundOff}
                      sx={{ minWidth: 100 }}
                    >
                      <MenuItem value="add">Add</MenuItem>
                      <MenuItem value="subtract">Subtract</MenuItem>
                    </Select>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ width: 110 }}
                      disabled={form.autoRoundOff}
                      value={form.autoRoundOff ? Math.abs(base.autoRoundOffValue).toFixed(2) : form.manualRoundOffAmount}
                      onChange={(e) => set('manualRoundOffAmount', Number(e.target.value))}
                    />
                  </Stack>

                  <Divider />

                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={600}>Total Amount</Typography>
                    <Typography fontWeight={600} fontSize={18}>
                      {formatCurrencyPrecise(total)}
                    </Typography>
                  </Stack>

                  <TextField
                    label="Amount Received"
                    type="number"
                    size="small"
                    value={form.amountPaid}
                    onChange={(e) => set('amountPaid', Number(e.target.value))}
                  />

                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Balance Amount</Typography>
                    <Typography fontWeight={500}>{formatCurrencyPrecise(balance)}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Authorized signatory for
                </Typography>
                <Stack spacing={1.5}>
                  <TextField
                    placeholder="Your Name/Company Name"
                    fullWidth
                    value={form.signatoryName}
                    onChange={(e) => set('signatoryName', e.target.value)}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleSignatureFile(file)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<CloudUploadOutlinedIcon />}
                    disabled={uploadingSignature}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingSignature ? 'Uploading...' : form.signatureUrl ? 'Replace signature' : 'Upload signature'}
                  </Button>
                  {form.signatureUrl && (
                    <Box
                      component="img"
                      src={form.signatureUrl}
                      alt="Authorized signatory signature"
                      sx={{ maxHeight: 80, objectFit: 'contain', alignSelf: 'flex-start' }}
                    />
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <SalesDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="credit_note"
        title="Quick Credit Note Settings"
        showPriceHistory={false}
      />
      <BarcodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeDetected} />
    </Stack>
  )
}
