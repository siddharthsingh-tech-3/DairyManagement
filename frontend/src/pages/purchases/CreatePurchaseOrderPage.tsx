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
import { createPurchaseOrder } from '@/api/purchases'
import { listSettings } from '@/api/settings'
import { listProducts } from '@/api/products'
import { uploadFile } from '@/api/uploads'
import { SupplierSelectField } from '@/features/purchases/SupplierSelectField'
import {
  PurchaseLineItemsTable,
  emptyLineItem,
  lineItemFromProduct,
  type PurchaseLineItemDraft,
} from '@/features/purchases/PurchaseLineItemsTable'
import { PurchaseDocumentSettingsDialog } from '@/features/purchases/PurchaseDocumentSettingsDialog'
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
  const subtotal = items.reduce((s, i) => s + i.rate * i.quantity * (1 - i.discount_percent / 100), 0)
  const taxAmount = items.reduce((s, i) => s + (i.rate * i.quantity * (1 - i.discount_percent / 100) * i.tax_percent) / 100, 0)
  const beforeRoundOff = subtotal - discountAmount + additionalCharges + taxAmount - tdsAmount + tcsAmount
  const autoRoundOffValue = Math.round(beforeRoundOff) - beforeRoundOff
  return { subtotal, taxAmount, beforeRoundOff, autoRoundOffValue }
}

function initialFormState() {
  return {
    vendorId: '',
    orderDate: dayjs().format('YYYY-MM-DD'),
    validTillEnabled: false,
    validTill: dayjs().add(15, 'day').format('YYYY-MM-DD'),
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

export function CreatePurchaseOrderPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [form, setForm] = useState(initialFormState)
  const set = <K extends keyof ReturnType<typeof initialFormState>>(key: K, value: ReturnType<typeof initialFormState>[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const [poPrefix, setPoPrefix] = useState('')
  const [poNo, setPoNo] = useState('')
  const poNumberEditedRef = useRef(false)
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: listSettings })
  useEffect(() => {
    if (poNumberEditedRef.current || !settingsData) return
    const find = (key: string) => settingsData.find((s) => s.key === key)?.value
    setPoPrefix(find('purchase_order_prefix') ?? 'PO-')
    setPoNo(find('purchase_order_seq') ?? '1')
  }, [settingsData])

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: listProducts })

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
      const trimmedPrefix = poPrefix.trim()
      const trimmedNo = poNo.trim()
      return createPurchaseOrder({
        vendor_id: form.vendorId,
        po_number: trimmedPrefix && trimmedNo ? `${trimmedPrefix}${trimmedNo}` : undefined,
        order_date: form.orderDate,
        valid_till: form.validTillEnabled ? form.validTill : null,
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
            discount_percent: i.discount_percent,
            tax_percent: i.tax_percent,
          })),
      })
    },
    onSuccess: async () => {
      toast('Purchase order saved')
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      if (saveModeRef.current === 'saveAndNew') {
        poNumberEditedRef.current = false
        setForm(initialFormState())
      } else {
        navigate('/purchases/orders')
      }
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const handleSave = (mode: 'save' | 'saveAndNew') => {
    if (!form.vendorId) {
      setError('Select a supplier')
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
        <IconButton onClick={() => navigate('/purchases/orders')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Create Purchase Order
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
                  Vendor Details
                </Typography>
                <SupplierSelectField value={form.vendorId} onChange={(v) => set('vendorId', v)} />
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography fontWeight={600} sx={{ mb: 2 }}>
                  Order Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={4}>
                    <TextField
                      label="Order Prefix"
                      fullWidth
                      value={poPrefix}
                      onChange={(e) => {
                        poNumberEditedRef.current = true
                        setPoPrefix(e.target.value)
                      }}
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      label="Order No."
                      fullWidth
                      value={poNo}
                      onChange={(e) => {
                        poNumberEditedRef.current = true
                        setPoNo(e.target.value)
                      }}
                    />
                  </Grid>
                  <Grid size={4} />
                  <Grid size={6}>
                    <TextField
                      label="Purchase Order Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      value={form.orderDate}
                      onChange={(e) => set('orderDate', e.target.value)}
                    />
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
                  <Grid size={6}>
                    <FormControlLabel
                      control={<Switch checked={form.validTillEnabled} onChange={(e) => set('validTillEnabled', e.target.checked)} />}
                      label="Valid Till"
                    />
                    {form.validTillEnabled && (
                      <TextField
                        type="date"
                        size="small"
                        sx={{ ml: 2 }}
                        InputLabelProps={{ shrink: true }}
                        value={form.validTill}
                        onChange={(e) => set('validTill', e.target.value)}
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
                <PurchaseLineItemsTable items={form.items} onChange={(items) => set('items', items)} />
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
                    label="Apply TDS"
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
                    label="Amount Paid"
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

      <PurchaseDocumentSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        docType="purchase_order"
        title="Purchase Order Settings"
      />
      <BarcodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeDetected} />
    </Stack>
  )
}
