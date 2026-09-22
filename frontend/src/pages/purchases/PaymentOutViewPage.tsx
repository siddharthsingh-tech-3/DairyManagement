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
import { listPaymentsOut, listPurchaseInvoices } from '@/api/purchases'
import { formatCurrencyPrecise } from '@/utils/format'

export function PaymentOutViewPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const navigate = useNavigate()

  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments-out'], queryFn: () => listPaymentsOut() })
  const payment = payments.find((p) => p.id === paymentId) ?? null

  const { data: invoices = [] } = useQuery({
    queryKey: ['purchase-invoices', payment?.vendor_id],
    queryFn: () => listPurchaseInvoices(payment!.vendor_id),
    enabled: !!payment,
  })

  const downloadPdf = () => {
    if (!payment) return
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`Payment Out #${payment.payment_number}`, 14, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Party Name: ${payment.vendor_name}`, 14, 26)
    doc.text(`Payment Date: ${dayjs(payment.payment_date).format('DD/MM/YYYY')}`, 14, 32)
    doc.text(`Amount Paid: ${formatCurrencyPrecise(payment.amount)}`, 14, 38)
    doc.text(`Payment Mode: ${payment.method.replace(/_/g, ' ')}`, 14, 44)

    autoTable(doc, {
      startY: 52,
      head: [['Invoice Number', 'Invoice Amount', 'Discount', 'Amount Paid']],
      body: payment.allocations.map((a) => [
        a.invoice_number,
        formatCurrencyPrecise(invoices.find((i) => i.id === a.purchase_invoice_id)?.total_amount ?? 0),
        formatCurrencyPrecise(a.discount),
        formatCurrencyPrecise(a.amount),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [63, 174, 125] },
    })

    doc.save(`${payment.payment_number.replace(/\//g, '-')}.pdf`)
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (!payment) {
    return (
      <Stack spacing={2} alignItems="flex-start">
        <Typography>Payment out not found.</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/purchases/payments-out')}>
          Back to Payment Out
        </Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={() => navigate('/purchases/payments-out')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={600}>
            Payment Out #{payment.payment_number}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={downloadPdf}>
            Download PDF
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print PDF
          </Button>
        </Stack>
      </Stack>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #payment-out-print, #payment-out-print * { visibility: visible; }
          #payment-out-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <Paper id="payment-out-print" variant="outlined" sx={{ maxWidth: 1100, width: '100%' }}>
        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
          <Typography fontWeight={600}>Payment Details</Typography>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
            gap: 3,
            p: 2.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Party Name
            </Typography>
            <Typography fontWeight={500}>{payment.vendor_name}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Payment Date
            </Typography>
            <Typography fontWeight={500}>{dayjs(payment.payment_date).format('DD/MM/YYYY')}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Amount Paid
            </Typography>
            <Typography fontWeight={500}>{formatCurrencyPrecise(payment.amount)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Payment Out Discount
            </Typography>
            <Typography fontWeight={500}>{formatCurrencyPrecise(payment.discount_amount)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Payment Mode
            </Typography>
            <Typography fontWeight={500} textTransform="capitalize">
              {payment.method.replace(/_/g, ' ')}
            </Typography>
          </Box>
          {payment.reference && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Reference
              </Typography>
              <Typography fontWeight={500}>{payment.reference}</Typography>
            </Box>
          )}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Notes
            </Typography>
            <Typography fontWeight={500}>{payment.notes || '--'}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined">
        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
          <Typography fontWeight={600}>Invoices settled with this payment</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Invoice Number</TableCell>
              <TableCell align="right">Invoice Amount</TableCell>
              <TableCell align="right">Discount</TableCell>
              <TableCell align="right">Amount Paid</TableCell>
              <TableCell align="right">Balance Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payment.allocations.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No invoices were settled with this payment
                </TableCell>
              </TableRow>
            )}
            {payment.allocations.map((a) => {
              const invoice = invoices.find((i) => i.id === a.purchase_invoice_id)
              const balance = invoice ? Number(invoice.total_amount) - Number(invoice.amount_paid) : null
              return (
                <TableRow
                  key={a.purchase_invoice_id}
                  hover={!!invoice}
                  onClick={() => invoice && navigate(`/purchases/invoices/${invoice.id}`)}
                  sx={{ cursor: invoice ? 'pointer' : 'default' }}
                >
                  <TableCell>{invoice ? dayjs(invoice.invoice_date).format('DD MMM YYYY') : '--'}</TableCell>
                  <TableCell>
                    <Typography color="primary.main" fontWeight={500} fontSize={13}>
                      {a.invoice_number}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{invoice ? formatCurrencyPrecise(invoice.total_amount) : '--'}</TableCell>
                  <TableCell align="right">{formatCurrencyPrecise(a.discount)}</TableCell>
                  <TableCell align="right">{formatCurrencyPrecise(a.amount)}</TableCell>
                  <TableCell align="right">{balance !== null ? formatCurrencyPrecise(balance) : '--'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  )
}
