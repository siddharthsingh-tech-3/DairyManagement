import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
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
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import DownloadIcon from '@mui/icons-material/Download'
import ShareIcon from '@mui/icons-material/Share'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import { bulkCreateVendors, type BulkVendorRow, type BulkVendorRowResult } from '@/api/vendors'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

interface GridRow {
  partyName: string
  mobileNumber: string
  gstNumber: string
  shippingAddress: string
  shippingPincode: string
  shippingCity: string
  shippingState: string
  billingAddress: string
  billingPincode: string
  billingCity: string
  billingState: string
  openingBalance: string
  balanceType: 'to_collect' | 'to_pay'
  creditPeriod: string
  emailId: string
}

const emptyRow: GridRow = {
  partyName: '',
  mobileNumber: '',
  gstNumber: '',
  shippingAddress: '',
  shippingPincode: '',
  shippingCity: '',
  shippingState: '',
  billingAddress: '',
  billingPincode: '',
  billingCity: '',
  billingState: '',
  openingBalance: '',
  balanceType: 'to_collect',
  creditPeriod: '',
  emailId: '',
}

const INITIAL_ROW_COUNT = 15

const COLUMNS: { key: keyof GridRow; header: string; width: number; mandatory?: boolean }[] = [
  { key: 'partyName', header: 'Party Name* (mandatory field)', width: 190, mandatory: true },
  { key: 'mobileNumber', header: 'Mobile Number', width: 140 },
  { key: 'gstNumber', header: 'GST number', width: 150 },
  { key: 'shippingAddress', header: 'Shipping Address', width: 170 },
  { key: 'shippingPincode', header: 'Shipping pincode', width: 120 },
  { key: 'shippingCity', header: 'Shipping city', width: 130 },
  { key: 'shippingState', header: 'Shipping state', width: 130 },
  { key: 'billingAddress', header: 'Billing Address', width: 170 },
  { key: 'billingPincode', header: 'Billing pincode', width: 120 },
  { key: 'billingCity', header: 'Billing city', width: 130 },
  { key: 'billingState', header: 'Billing state', width: 130 },
  { key: 'openingBalance', header: 'Opening balance', width: 130 },
  { key: 'creditPeriod', header: 'Credit Period (days)', width: 130 },
  { key: 'emailId', header: 'Email ID', width: 190 },
]

const SAMPLE_CSV_HEADER =
  'Party Name (mandatory),Mobile Number,GST number,Shipping Address,Shipping pincode,Shipping city,Shipping state,Billing Address,Billing pincode,Billing city,Billing state,Party Type,Opening balance,Balance Type (to_collect/to_pay),Credit Period (days),Email ID'
const SAMPLE_CSV_ROW =
  'Sharma Dairy Point,9822041122,27AAWCS1234K1Z2,12 MG Road,411001,Pune,Maharashtra,12 MG Road,411001,Pune,Maharashtra,Vendor,5000,to_collect,15,sharma@example.com'

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function rowToCsv(row: GridRow): string {
  const cells = [
    row.partyName,
    row.mobileNumber,
    row.gstNumber,
    row.shippingAddress,
    row.shippingPincode,
    row.shippingCity,
    row.shippingState,
    row.billingAddress,
    row.billingPincode,
    row.billingCity,
    row.billingState,
    'Vendor',
    row.openingBalance,
    row.balanceType,
    row.creditPeriod,
    row.emailId,
  ]
  return cells.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')
}

export function BulkAddVendorsPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<GridRow[]>(() => Array.from({ length: INITIAL_ROW_COUNT }, () => ({ ...emptyRow })))
  const [howToUseOpen, setHowToUseOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState<BulkVendorRowResult[] | null>(null)

  const mutation = useMutation({
    mutationFn: bulkCreateVendors,
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const updateCell = (rowIndex: number, key: keyof GridRow, value: string) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === rowIndex ? { ...r, [key]: value } : r))
      // Spreadsheet-style auto-grow: filling the last row's Party Name appends a fresh row.
      const isLastRow = rowIndex === prev.length - 1
      if (isLastRow && key === 'partyName' && value.trim() && !prev[rowIndex].partyName.trim()) {
        next.push({ ...emptyRow })
      }
      return next
    })
  }

  const filledRows = rows.filter((r) => r.partyName.trim())

  const handleReset = () => {
    setRows((prev) => prev.map(() => ({ ...emptyRow })))
    toast('Grid values cleared')
  }

  const handleClearAll = () => {
    setRows(Array.from({ length: INITIAL_ROW_COUNT }, () => ({ ...emptyRow })))
    toast('All rows cleared')
  }

  const handleDownloadSample = () => {
    downloadTextFile(`${SAMPLE_CSV_HEADER}\n${SAMPLE_CSV_ROW}`, 'bulk-add-vendors-sample.csv')
  }

  const handleShareDraft = () => {
    if (filledRows.length === 0) {
      toast('Fill in at least one row first', 'error')
      return
    }
    const csv = [SAMPLE_CSV_HEADER, ...filledRows.map(rowToCsv)].join('\n')
    downloadTextFile(csv, 'bulk-add-vendors-draft.csv')
    toast('Draft exported to CSV — share the file with your team')
  }

  const handleAddVendors = async () => {
    if (filledRows.length === 0) {
      toast('Add at least one vendor (Party Name is required)', 'error')
      return
    }
    const payload: BulkVendorRow[] = filledRows.map((r) => ({
      name: r.partyName.trim(),
      phone: r.mobileNumber || null,
      gstin: r.gstNumber || null,
      shipping_street: r.shippingAddress || null,
      shipping_pincode: r.shippingPincode || null,
      shipping_city: r.shippingCity || null,
      shipping_state: r.shippingState || null,
      billing_street: r.billingAddress || null,
      billing_pincode: r.billingPincode || null,
      billing_city: r.billingCity || null,
      billing_state: r.billingState || null,
      opening_balance: r.openingBalance ? Number(r.openingBalance) : 0,
      opening_balance_direction: r.balanceType,
      credit_period_days: r.creditPeriod ? Number(r.creditPeriod) : 0,
      email: r.emailId || null,
    }))

    const result = await mutation.mutateAsync(payload)
    await queryClient.invalidateQueries({ queryKey: ['vendors'] })
    setResultDialog(result.results)
    if (result.failed_count === 0) {
      toast(`${result.created_count} vendor(s) added`)
    }
  }

  return (
    <Stack spacing={0} sx={{ mx: -3.5, mt: -3.5 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/vendors')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography fontWeight={600} fontSize={17}>
            Bulk Add Vendors
          </Typography>
          <Button size="small" startIcon={<HelpOutlineIcon fontSize="small" />} onClick={() => setHowToUseOpen(true)}>
            How to Use
          </Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon fontSize="small" />} onClick={handleDownloadSample}>
            Download Sample
          </Button>
          <Button size="small" variant="outlined" startIcon={<ShareIcon fontSize="small" />} onClick={handleShareDraft}>
            Share
          </Button>
          <Button size="small" variant="outlined" startIcon={<RestartAltIcon fontSize="small" />} onClick={handleReset}>
            Reset
          </Button>
          <Button size="small" variant="outlined" color="error" startIcon={<DeleteSweepIcon fontSize="small" />} onClick={handleClearAll}>
            Clear All Vendors
          </Button>
          <Button size="small" variant="contained" disabled={mutation.isPending} onClick={handleAddVendors}>
            {mutation.isPending ? 'Adding…' : `Add Vendors${filledRows.length ? ` (${filledRows.length})` : ''}`}
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} square elevation={0} sx={{ maxHeight: 'calc(100vh - 190px)' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 1700 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, fontWeight: 500 }}>#</TableCell>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} sx={{ minWidth: col.width, fontWeight: 500, fontSize: 12 }}>
                  {col.header}
                </TableCell>
              ))}
              <TableCell sx={{ minWidth: 90, fontWeight: 500, fontSize: 12 }}>Party Type</TableCell>
              <TableCell sx={{ minWidth: 110, fontWeight: 500, fontSize: 12 }}>Balance Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex} hover>
                <TableCell sx={{ color: 'text.secondary' }}>{rowIndex + 1}</TableCell>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key} sx={{ p: 0.5 }}>
                    <TextField
                      variant="standard"
                      fullWidth
                      value={row[col.key]}
                      placeholder={col.mandatory ? 'Required' : undefined}
                      onChange={(e) => updateCell(rowIndex, col.key, e.target.value)}
                      slotProps={{ input: { disableUnderline: false, sx: { fontSize: 13 } } }}
                    />
                  </TableCell>
                ))}
                <TableCell sx={{ p: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Vendor
                  </Typography>
                </TableCell>
                <TableCell sx={{ p: 0.5 }}>
                  <Select
                    variant="standard"
                    fullWidth
                    value={row.balanceType}
                    onChange={(e) => updateCell(rowIndex, 'balanceType', e.target.value)}
                    sx={{ fontSize: 13 }}
                  >
                    <MenuItem value="to_collect">To Collect</MenuItem>
                    <MenuItem value="to_pay">To Pay</MenuItem>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={howToUseOpen} onClose={() => setHowToUseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>How to use bulk add</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">• Only <b>Party Name</b> is required — everything else is optional.</Typography>
            <Typography variant="body2">• A new blank row appears automatically once you start typing in the last row.</Typography>
            <Typography variant="body2">• <b>Opening balance</b> + <b>Balance Type</b> post a real ledger entry: "To Collect" means the vendor owes you, "To Pay" means you owe them.</Typography>
            <Typography variant="body2">• Area and delivery route aren't collected here — new vendors are created as "Unassigned" and can be set from the vendor's edit screen.</Typography>
            <Typography variant="body2">• <b>Download Sample</b> gets you a template CSV; <b>Share</b> exports your current draft so you can send it to a teammate.</Typography>
            <Typography variant="body2">• Click <b>Add Vendors</b> when ready — each row is created independently, so one bad row won't block the rest.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setHowToUseOpen(false)}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resultDialog} onClose={() => setResultDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Bulk add results</DialogTitle>
        <DialogContent>
          {resultDialog && (
            <Stack spacing={1.5}>
              <Alert severity={resultDialog.some((r) => !r.success) ? 'warning' : 'success'}>
                {resultDialog.filter((r) => r.success).length} of {resultDialog.length} vendor(s) added successfully.
              </Alert>
              <Stack spacing={1} sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {resultDialog.map((r) => (
                  <Stack key={r.row_index} direction="row" spacing={1.5} alignItems="center">
                    <Chip
                      size="small"
                      label={r.success ? 'Added' : 'Failed'}
                      color={r.success ? 'success' : 'error'}
                      sx={{ minWidth: 64 }}
                    />
                    <Typography variant="body2" fontWeight={500}>
                      {r.name}
                    </Typography>
                    {r.error && (
                      <Tooltip title={r.error}>
                        <Typography variant="caption" color="error.main" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.error}
                        </Typography>
                      </Tooltip>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setResultDialog(null)
              navigate('/vendors')
            }}
          >
            Go to Vendors
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
