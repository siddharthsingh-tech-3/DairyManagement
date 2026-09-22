import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { payInvoiceFull, remindInvoice } from '@/api/billing'
import { StatusBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/utils/format'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { Invoice } from '@/types/models'

export function InvoiceDetailDialog({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const pay = useMutation({
    mutationFn: () => payInvoiceFull(invoice!.id),
    onSuccess: async () => {
      toast('Payment recorded')
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const remind = useMutation({
    mutationFn: () => remindInvoice(invoice!.id),
    onSuccess: () => toast('WhatsApp reminder sent with UPI payment link'),
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  if (!invoice) return null
  const isPaid = invoice.status === 'paid'

  return (
    <Dialog open={!!invoice} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography fontWeight={600}>Kshirsagar Dairy</Typography>
          <Typography variant="caption" color="text.secondary">
            Tax Invoice
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={14}>
            {invoice.invoice_no}
          </Typography>
          <StatusBadge status={invoice.status} />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          BILLED TO
        </Typography>
        <Typography fontWeight={600} sx={{ mb: 2 }}>
          {invoice.vendor_name}
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>HSN</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>{it.description}</TableCell>
                <TableCell>{it.hsn_code}</TableCell>
                <TableCell align="right">₹{it.rate}</TableCell>
                <TableCell align="right">{it.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(it.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack spacing={1} sx={{ mt: 2, ml: 'auto', width: 240 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Taxable value
            </Typography>
            <Typography variant="body2">{formatCurrency(invoice.subtotal)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              CGST
            </Typography>
            <Typography variant="body2">{formatCurrency(invoice.cgst)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              SGST
            </Typography>
            <Typography variant="body2">{formatCurrency(invoice.sgst)}</Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Typography fontWeight={600}>Total</Typography>
            <Typography fontWeight={600}>{formatCurrency(invoice.total)}</Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={() => remind.mutate()} disabled={remind.isPending} color="success">
          WhatsApp reminder
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button variant="contained" disabled={isPaid || pay.isPending} onClick={() => pay.mutate()}>
          {isPaid ? 'Payment settled' : 'Record full payment'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
