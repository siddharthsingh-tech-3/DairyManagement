import { useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkCreateProducts, type ProductPayload } from '@/api/products'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const TEMPLATE_HEADERS = ['sku', 'name', 'category', 'hsn_code', 'rate', 'gst_percent', 'current_stock']
const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(',')}\nSKU001,Sample Item,Product,1806,25,5,100\n`

function parseCsv(text: string): { rows: ProductPayload[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { rows: [], errors: ['File is empty'] }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const required = ['sku', 'name', 'hsn_code', 'rate']
  const missing = required.filter((r) => !headers.includes(r))
  if (missing.length > 0) return { rows: [], errors: [`Missing required column(s): ${missing.join(', ')}`] }

  const rows: ProductPayload[] = []
  const errors: string[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim())
    const get = (key: string) => {
      const idx = headers.indexOf(key)
      return idx === -1 ? '' : (cells[idx] ?? '')
    }
    const sku = get('sku')
    const name = get('name')
    const hsn_code = get('hsn_code')
    const rate = Number(get('rate'))
    if (!sku || !name || !hsn_code || !Number.isFinite(rate) || rate <= 0) {
      errors.push(`Row ${i + 1}: missing/invalid required field(s)`)
      continue
    }
    rows.push({
      sku,
      name,
      category: get('category') || null,
      hsn_code,
      rate,
      gst_percent: Number(get('gst_percent')) || 5,
      reorder_level: 0,
      current_stock: Number(get('current_stock')) || 0,
    })
  }
  return { rows, errors }
}

export function BulkAddCsvDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<{ rows: ProductPayload[]; errors: string[] } | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (items: ProductPayload[]) => bulkCreateProducts(items),
    onSuccess: async (created) => {
      toast(`${created.length} items imported`)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      handleClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const handleFile = async (file: File) => {
    setFileName(file.name)
    const text = await file.text()
    setParsed(parseCsv(text))
  }

  const handleClose = () => {
    setParsed(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Bulk add items</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Upload a CSV file to add many items at once. Required columns: sku, name, hsn_code, rate. Optional:
          category, gst_percent, current_stock.
        </Typography>
        <Link href={templateHref} download="items-template.csv" sx={{ fontSize: 13 }}>
          Download CSV template
        </Link>

        <Box sx={{ mt: 2, mb: 1 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          <Button startIcon={<UploadFileIcon />} variant="outlined" onClick={() => fileInputRef.current?.click()}>
            {fileName ?? 'Choose CSV file'}
          </Button>
        </Box>

        {parsed && parsed.errors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {parsed.errors.length} row(s) skipped — {parsed.errors.slice(0, 3).join('; ')}
            {parsed.errors.length > 3 ? '…' : ''}
          </Alert>
        )}

        {parsed && parsed.rows.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>HSN</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="right">GST%</TableCell>
                <TableCell align="right">Opening stock</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {parsed.rows.slice(0, 20).map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.sku}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.category ?? '—'}</TableCell>
                  <TableCell>{r.hsn_code}</TableCell>
                  <TableCell align="right">₹{r.rate}</TableCell>
                  <TableCell align="right">{r.gst_percent}%</TableCell>
                  <TableCell align="right">{r.current_stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {parsed && parsed.rows.length > 20 && (
          <Typography variant="caption" color="text.secondary">
            + {parsed.rows.length - 20} more row(s) not shown
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!parsed || parsed.rows.length === 0 || mutation.isPending}
          onClick={() => parsed && mutation.mutate(parsed.rows)}
        >
          Import {parsed?.rows.length ?? 0} items
        </Button>
      </DialogActions>
    </Dialog>
  )
}
