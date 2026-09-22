import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PrintIcon from '@mui/icons-material/Print'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { listPurchaseInvoices } from '@/api/purchases'
import { getVendor } from '@/api/vendors'
import { listSettings } from '@/api/settings'
import { StatusBadge } from '@/components/StatusBadge'
import { amountToWordsIndian, formatCurrency } from '@/utils/format'
import type { PurchaseItem } from '@/types/models'

const gridSx = {
  '& td, & th': { border: '1px solid', borderColor: 'divider', fontSize: 12.5, py: 0.75, px: 1 },
}

interface HsnGroup {
  hsn: string
  taxRate: number
  taxableValue: number
  cgstAmount: number
  sgstAmount: number
  totalTax: number
}

function groupByHsn(items: PurchaseItem[]): HsnGroup[] {
  const map = new Map<string, HsnGroup>()
  for (const item of items) {
    const rate = Number(item.tax_percent)
    const amount = Number(item.amount)
    const taxable = rate > 0 ? amount / (1 + rate / 100) : amount
    const totalTax = amount - taxable
    const key = `${item.hsn_code}|${rate}`
    const existing = map.get(key)
    if (existing) {
      existing.taxableValue += taxable
      existing.totalTax += totalTax
      existing.cgstAmount += totalTax / 2
      existing.sgstAmount += totalTax / 2
    } else {
      map.set(key, { hsn: item.hsn_code, taxRate: rate, taxableValue: taxable, cgstAmount: totalTax / 2, sgstAmount: totalTax / 2, totalTax })
    }
  }
  return Array.from(map.values())
}

export function PurchaseInvoiceViewPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const navigate = useNavigate()

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ['purchase-invoices'], queryFn: () => listPurchaseInvoices() })
  const invoice = invoices.find((i) => i.id === invoiceId) ?? null

  const { data: vendor } = useQuery({
    queryKey: ['vendor', invoice?.vendor_id],
    queryFn: () => getVendor(invoice!.vendor_id),
    enabled: !!invoice,
  })

  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: listSettings })
  const businessName = settings.find((s) => s.key === 'business_name')?.value ?? 'My Business'
  const businessGstin = settings.find((s) => s.key === 'gstin')?.value

  const hsnGroups = useMemo(() => (invoice ? groupByHsn(invoice.items) : []), [invoice])

  const totalQty = useMemo(() => (invoice ? invoice.items.reduce((s, i) => s + Number(i.quantity), 0) : 0), [invoice])

  const downloadPdf = () => {
    if (!invoice) return
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(businessName, 14, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    let leftY = 22
    if (businessGstin) {
      doc.text(`GSTIN: ${businessGstin}`, 14, leftY)
      leftY += 5
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Purchase No.', 150, 16)
    doc.text('Purchase Date', 150, 28)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.invoice_number, 150, 21)
    doc.text(dayjs(invoice.invoice_date).format('DD/MM/YYYY'), 150, 33)

    let y = Math.max(leftY, 33) + 6
    doc.setFont('helvetica', 'bold')
    doc.text('BILL FROM', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.vendor_name, 14, y)
    if (vendor?.billing_state) {
      y += 5
      doc.text(`Place of Supply: ${vendor.billing_state}`, 14, y)
    }
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['S.No', 'Item', 'HSN', 'Qty', 'Rate', 'Amount']],
      body: invoice.items.map((it, idx) => [
        idx + 1,
        it.description,
        it.hsn_code,
        it.quantity,
        formatCurrency(it.rate),
        formatCurrency(it.amount),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [63, 174, 125] },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterItemsY = (doc as any).lastAutoTable.finalY + 8

    autoTable(doc, {
      startY: afterItemsY,
      head: [['HSN/SAC', 'Taxable Value', 'CGST', 'SGST', 'Total Tax']],
      body: hsnGroups.map((g) => [
        g.hsn,
        formatCurrency(g.taxableValue),
        formatCurrency(g.cgstAmount),
        formatCurrency(g.sgstAmount),
        formatCurrency(g.totalTax),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [63, 174, 125] },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterTaxY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Amount: ${formatCurrency(invoice.total_amount)}`, 14, afterTaxY)
    doc.setFont('helvetica', 'normal')
    doc.text(`Amount in words: ${amountToWordsIndian(invoice.total_amount)}`, 14, afterTaxY + 6)

    doc.save(`${invoice.invoice_number.replace(/\//g, '-')}.pdf`)
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (!invoice) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Typography>Purchase invoice not found.</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/purchases/invoices')}>
          Back to Purchase Invoices
        </Button>
      </Stack>
    )
  }

  const balance = Number(invoice.total_amount) - Number(invoice.amount_paid)

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={() => navigate('/purchases/invoices')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Purchase Invoice #{invoice.invoice_number}
          </Typography>
          <StatusBadge status={invoice.status} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={downloadPdf}>
            Download PDF
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print PDF
          </Button>
          <Button
            variant="contained"
            disabled={balance <= 0}
            onClick={() =>
              navigate('/purchases/payments-out/new', {
                state: { vendorId: invoice.vendor_id, invoiceId: invoice.id, amount: balance },
              })
            }
          >
            {balance <= 0 ? 'Fully Paid' : 'Record Payment Out'}
          </Button>
        </Stack>
      </Stack>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #purchase-invoice-print, #purchase-invoice-print * { visibility: visible; }
          #purchase-invoice-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <Paper id="purchase-invoice-print" variant="outlined" sx={{ maxWidth: 900, mx: 'auto', width: '100%' }}>
        <Typography sx={{ p: 1, fontWeight: 600, fontSize: 12, letterSpacing: 0.5 }}>PURCHASE</Typography>

        <Box sx={{ display: 'flex', borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ flex: 1.4, p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
            <Typography fontWeight={600}>{businessName}</Typography>
            {businessGstin && (
              <Typography variant="caption" display="block" color="text.secondary">
                <b>GSTIN:</b> {businessGstin}
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: 1, p: 1.5 }}>
            <Typography variant="caption" fontWeight={600} display="block" color="text.secondary">
              PURCHASE NO.
            </Typography>
            <Typography fontWeight={500} sx={{ mb: 1 }}>
              {invoice.invoice_number}
            </Typography>
            <Typography variant="caption" fontWeight={600} display="block" color="text.secondary">
              PURCHASE DATE
            </Typography>
            <Typography fontWeight={500}>{dayjs(invoice.invoice_date).format('DD/MM/YYYY')}</Typography>
          </Box>
        </Box>

        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600} display="block" color="text.secondary">
            BILL FROM
          </Typography>
          <Typography fontWeight={500}>{invoice.vendor_name}</Typography>
          {vendor?.billing_state && (
            <Typography variant="caption" color="text.secondary">
              Place of Supply: {vendor.billing_state}
            </Typography>
          )}
        </Box>

        <Table size="small" sx={{ ...gridSx, borderTop: '1px solid', borderColor: 'divider' }}>
          <TableHead>
            <TableRow>
              <TableCell width={48}>S.NO.</TableCell>
              <TableCell>ITEMS</TableCell>
              <TableCell width={90}>HSN</TableCell>
              <TableCell width={70} align="right">
                QTY.
              </TableCell>
              <TableCell width={90} align="right">
                RATE
              </TableCell>
              <TableCell width={100} align="right">
                AMOUNT
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.items.map((it, idx) => (
              <TableRow key={it.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{it.description}</TableCell>
                <TableCell>{it.hsn_code}</TableCell>
                <TableCell align="right">{it.quantity} PCS</TableCell>
                <TableCell align="right">{formatCurrency(it.rate)}</TableCell>
                <TableCell align="right">{formatCurrency(it.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                TOTAL
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {totalQty}
              </TableCell>
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(invoice.total_amount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Table size="small" sx={gridSx}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ verticalAlign: 'middle' }}>
                HSN/SAC
              </TableCell>
              <TableCell rowSpan={2} align="right" sx={{ verticalAlign: 'middle' }}>
                TAXABLE VALUE
              </TableCell>
              <TableCell colSpan={2} align="center">
                CGST
              </TableCell>
              <TableCell colSpan={2} align="center">
                SGST
              </TableCell>
              <TableCell rowSpan={2} align="right" sx={{ verticalAlign: 'middle' }}>
                TOTAL TAX AMOUNT
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="right">RATE</TableCell>
              <TableCell align="right">AMOUNT</TableCell>
              <TableCell align="right">RATE</TableCell>
              <TableCell align="right">AMOUNT</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hsnGroups.map((g) => (
              <TableRow key={g.hsn + g.taxRate}>
                <TableCell>{g.hsn}</TableCell>
                <TableCell align="right">{formatCurrency(g.taxableValue)}</TableCell>
                <TableCell align="right">{(g.taxRate / 2).toFixed(1)}%</TableCell>
                <TableCell align="right">{formatCurrency(g.cgstAmount)}</TableCell>
                <TableCell align="right">{(g.taxRate / 2).toFixed(1)}%</TableCell>
                <TableCell align="right">{formatCurrency(g.sgstAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(g.totalTax)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(hsnGroups.reduce((s, g) => s + g.taxableValue, 0))}
              </TableCell>
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(hsnGroups.reduce((s, g) => s + g.cgstAmount, 0))}
              </TableCell>
              <TableCell />
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(hsnGroups.reduce((s, g) => s + g.sgstAmount, 0))}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(hsnGroups.reduce((s, g) => s + g.totalTax, 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600} display="block" color="text.secondary">
            TOTAL AMOUNT (IN WORDS)
          </Typography>
          <Typography fontWeight={500} color="primary.main">
            {amountToWordsIndian(invoice.total_amount)}
          </Typography>
        </Box>

        <Box sx={{ p: 1.5, pt: 6, borderTop: '1px solid', borderColor: 'divider', textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Authorised Signatory For
          </Typography>
          <Typography fontWeight={500} color="primary.main">
            {businessName}
          </Typography>
        </Box>
      </Paper>
    </Stack>
  )
}
