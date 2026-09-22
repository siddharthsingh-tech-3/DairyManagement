import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { listVendors } from '@/api/vendors'
import { listSettings } from '@/api/settings'
import { INDIAN_STATES } from '@/constants/indianStates'
import {
  generateMockAckNumber,
  generateMockEwayBillNumber,
  generateMockIrn,
  getSellerDefaults,
  saveEInvoiceRecord,
  type EInvoicePartyDetails,
  type EInvoiceRecord,
  type EInvoiceTxnType,
} from '@/features/eInvoicing/eInvoiceStorage'
import { useEInvoiceTransactions } from '@/features/eInvoicing/useEInvoiceTransactions'
import { useToastStore } from '@/store/uiStore'

const TYPE_SUBTITLES: Record<EInvoiceTxnType, string> = {
  sales_invoice: 'Tax Invoice',
  credit_note: 'Credit Note',
  sales_return: 'Sales Return',
  debit_note: 'Debit Note',
}

const SUPPLY_TYPE_CODES = [
  { value: 'B2B', label: 'B2B' },
  { value: 'SEZWP', label: 'SEZ With Payment' },
  { value: 'SEZWOP', label: 'SEZ Without Payment' },
  { value: 'EXPWP', label: 'Export With Payment' },
  { value: 'EXPWOP', label: 'Export Without Payment' },
  { value: 'DEXP', label: 'Deemed Export' },
]

const TRANSACTION_TYPES = ['Regular', 'Bill To - Ship To', 'Bill From - Dispatch From', 'Combination of 2 and 3']

const TRANSPORT_MODES = ['Road', 'Rail', 'Air', 'Ship']

function emptyParty(): EInvoicePartyDetails {
  return { gstin: '', street: '', state: '', pincode: '', city: '' }
}

interface FormState {
  seller: EInvoicePartyDetails
  buyer: EInvoicePartyDetails
  supplyTypeCode: string
  transactionType: string
  transporterId: string
  transporterName: string
  approxDistanceKm: string
  modeOfTransportation: string
  vehicleNumber: string
  transporterDocNo: string
  transporterDocDate: string
  vehicleType: 'Regular' | 'Over Dimensional Cargo'
  hsnCodes: Record<string, string>
}

function initialFormState(): FormState {
  return {
    seller: emptyParty(),
    buyer: emptyParty(),
    supplyTypeCode: 'B2B',
    transactionType: 'Regular',
    transporterId: '',
    transporterName: '',
    approxDistanceKm: '0',
    modeOfTransportation: 'Road',
    vehicleNumber: '',
    transporterDocNo: '',
    transporterDocDate: dayjs().format('YYYY-MM-DD'),
    vehicleType: 'Regular',
    hsnCodes: {},
  }
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ bgcolor: 'action.hover', px: 2, py: 1, borderRadius: 1 }}
    >
      <Typography fontWeight={600} fontSize={14}>
        {title}
      </Typography>
      {action}
    </Stack>
  )
}

function StateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const options = value && !(INDIAN_STATES as readonly string[]).includes(value) ? [value, ...INDIAN_STATES] : INDIAN_STATES
  return (
    <TextField select label={label} required fullWidth size="small" value={value} onChange={(e) => onChange(e.target.value)}>
      <MenuItem value="">
        <em>To State</em>
      </MenuItem>
      {options.map((state) => (
        <MenuItem key={state} value={state}>
          {state}
        </MenuItem>
      ))}
    </TextField>
  )
}

function PartyDetailsForm({
  title,
  value,
  onChange,
}: {
  title: string
  value: EInvoicePartyDetails
  onChange: (next: EInvoicePartyDetails) => void
}) {
  const set = <K extends keyof EInvoicePartyDetails>(key: K, v: EInvoicePartyDetails[K]) => onChange({ ...value, [key]: v })
  return (
    <Stack spacing={2}>
      <Typography fontWeight={600}>{title}</Typography>
      <TextField
        label="GSTIN No"
        required
        fullWidth
        size="small"
        value={value.gstin}
        onChange={(e) => set('gstin', e.target.value.toUpperCase())}
        placeholder="Enter party GSTIN"
      />
      <TextField
        label="Street Address"
        required
        fullWidth
        multiline
        minRows={2}
        size="small"
        value={value.street}
        onChange={(e) => set('street', e.target.value)}
        placeholder="Enter address"
      />
      <Grid container spacing={2}>
        <Grid size={6}>
          <StateField label="State" value={value.state} onChange={(v) => set('state', v)} />
        </Grid>
        <Grid size={6}>
          <TextField
            label="Pincode"
            required
            fullWidth
            size="small"
            value={value.pincode}
            onChange={(e) => set('pincode', e.target.value)}
            placeholder="Enter party pincode"
          />
        </Grid>
      </Grid>
      <TextField
        label="City"
        fullWidth
        size="small"
        value={value.city}
        onChange={(e) => set('city', e.target.value)}
        placeholder="Enter City"
      />
    </Stack>
  )
}

export function GenerateEInvoicePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastStore((s) => s.show)
  const { type, id } = useParams<{ type: string; id: string }>()
  const withEwayBill = !!(location.state as { withEwayBill?: boolean } | null)?.withEwayBill

  const { transactions } = useEInvoiceTransactions()
  const txn = transactions.find((t) => t.type === type && t.id === id) ?? null
  const uniqueItems = useMemo(() => {
    const seen = new Map<string, { description: string; hsnCode: string }>()
    for (const item of txn?.items ?? []) {
      if (!seen.has(item.description)) seen.set(item.description, item)
    }
    return Array.from(seen.values())
  }, [txn])

  const vendorsQuery = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors() })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: listSettings })

  const [form, setForm] = useState<FormState>(initialFormState)
  const prefilledRef = useRef(false)

  useEffect(() => {
    if (prefilledRef.current || !txn || vendorsQuery.isLoading || settingsQuery.isLoading) return
    const vendor = (vendorsQuery.data ?? []).find((v) => v.id === txn.vendorId)
    const sellerDefaults = getSellerDefaults()
    const businessGstin = settingsQuery.data?.find((s) => s.key === 'gstin')?.value ?? ''
    const hsnCodes: Record<string, string> = {}
    txn.items.forEach((item) => {
      hsnCodes[item.description] = item.hsnCode
    })
    setForm((f) => ({
      ...f,
      seller: sellerDefaults ?? { ...emptyParty(), gstin: businessGstin },
      buyer: {
        gstin: vendor?.gstin ?? '',
        street: vendor?.billing_street ?? '',
        state: vendor?.billing_state ?? '',
        pincode: vendor?.billing_pincode ?? '',
        city: vendor?.billing_city ?? '',
      },
      hsnCodes,
    }))
    prefilledRef.current = true
  }, [txn, vendorsQuery.data, vendorsQuery.isLoading, settingsQuery.data, settingsQuery.isLoading])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const isPartyValid = (party: EInvoicePartyDetails) => !!(party.gstin && party.street && party.state && party.pincode)

  const canGenerate =
    !!txn &&
    isPartyValid(form.seller) &&
    isPartyValid(form.buyer) &&
    uniqueItems.every((item) => !!form.hsnCodes[item.description]) &&
    (!withEwayBill || !!form.approxDistanceKm)

  const handleGenerate = () => {
    if (!txn) return
    if (!canGenerate) {
      toast('Please fill all required fields', 'error')
      return
    }
    const record: EInvoiceRecord = {
      status: 'generated',
      ackNumber: generateMockAckNumber(),
      irn: generateMockIrn(),
      generatedAt: new Date().toISOString(),
      withEwayBill,
      ewayBillNumber: withEwayBill ? generateMockEwayBillNumber() : undefined,
      seller: form.seller,
      buyer: form.buyer,
      supplyTypeCode: form.supplyTypeCode,
      transactionType: form.transactionType,
      transport: withEwayBill
        ? {
            transporterId: form.transporterId,
            transporterName: form.transporterName,
            approxDistanceKm: form.approxDistanceKm,
            modeOfTransportation: form.modeOfTransportation,
            vehicleNumber: form.vehicleNumber,
            transporterDocNo: form.transporterDocNo,
            transporterDocDate: form.transporterDocDate,
            vehicleType: form.vehicleType,
          }
        : undefined,
      hsnCodes: form.hsnCodes,
    }
    saveEInvoiceRecord(txn.type, txn.id, record)
    toast(withEwayBill ? 'e-Invoice and e-Way Bill generated' : 'e-Invoice generated')
    navigate('/e-invoicing')
  }

  if (!txn) {
    return (
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={() => navigate('/e-invoicing')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={600}>
            Generate e-Invoice
          </Typography>
        </Stack>
        <Typography color="text.secondary">Loading transaction…</Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate('/e-invoicing')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          Generate e-Invoice ({TYPE_SUBTITLES[txn.type]})
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={() => navigate('/e-invoicing')}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleGenerate}>
          Generate e-Invoice
        </Button>
      </Stack>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PartyDetailsForm title="Seller Details" value={form.seller} onChange={(v) => setField('seller', v)} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PartyDetailsForm title="Buyer Details" value={form.buyer} onChange={(v) => setField('buyer', v)} />
        </Grid>
      </Grid>

      <SectionHeader title="Voucher Details" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Supply Type Code"
            required
            fullWidth
            size="small"
            value={form.supplyTypeCode}
            onChange={(e) => setField('supplyTypeCode', e.target.value)}
          >
            {SUPPLY_TYPE_CODES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            select
            label="Transaction Type"
            required
            fullWidth
            size="small"
            value={form.transactionType}
            onChange={(e) => setField('transactionType', e.target.value)}
          >
            {TRANSACTION_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {withEwayBill && (
        <>
          <SectionHeader title="Transportation Details" />
          <Grid container spacing={2} alignItems="flex-start">
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Transporter ID"
                fullWidth
                size="small"
                value={form.transporterId}
                onChange={(e) => setField('transporterId', e.target.value.toUpperCase())}
                placeholder="eg. 22AAA AA000 0A1Z5"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Transporter Name"
                fullWidth
                size="small"
                value={form.transporterName}
                onChange={(e) => setField('transporterName', e.target.value)}
                placeholder="Enter Name"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Approx Distance (In KM)"
                required
                fullWidth
                size="small"
                type="number"
                value={form.approxDistanceKm}
                onChange={(e) => setField('approxDistanceKm', e.target.value)}
              />
              <Typography variant="caption" color="text.secondary">
                Distance between the place of dispatch and delivery.
              </Typography>
            </Grid>
          </Grid>

          <SectionHeader title="PART B" />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                label="Mode Of Transportation"
                fullWidth
                size="small"
                value={form.modeOfTransportation}
                onChange={(e) => setField('modeOfTransportation', e.target.value)}
              >
                {TRANSPORT_MODES.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Vehicle Number"
                fullWidth
                size="small"
                value={form.vehicleNumber}
                onChange={(e) => setField('vehicleNumber', e.target.value.toUpperCase())}
                placeholder="ex - KA12BL4567"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Transporter's Doc No"
                fullWidth
                size="small"
                value={form.transporterDocNo}
                onChange={(e) => setField('transporterDocNo', e.target.value)}
                placeholder="ex - D123456"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Transporter's Doc Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={form.transporterDocDate}
                onChange={(e) => setField('transporterDocDate', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Vehicle Type
              </Typography>
              <RadioGroup
                row
                value={form.vehicleType}
                onChange={(e) => setField('vehicleType', e.target.value as FormState['vehicleType'])}
              >
                <FormControlLabel value="Regular" control={<Radio size="small" />} label="Regular" />
                <FormControlLabel value="Over Dimensional Cargo" control={<Radio size="small" />} label="Over Dimensional Cargo" />
              </RadioGroup>
            </Grid>
          </Grid>
        </>
      )}

      <SectionHeader
        title="Add HSN Code for Items"
        action={
          <Typography
            variant="body2"
            color="primary"
            sx={{ cursor: 'pointer' }}
            onClick={() => toast('HSN code lookup is not available yet', 'info')}
          >
            Find HSN Code
          </Typography>
        }
      />
      <Grid container spacing={2}>
        {uniqueItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.description}>
            <TextField
              label={item.description}
              required
              fullWidth
              size="small"
              value={form.hsnCodes[item.description] ?? ''}
              onChange={(e) => setField('hsnCodes', { ...form.hsnCodes, [item.description]: e.target.value })}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}
