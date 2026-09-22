import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { StatusBadge } from '@/components/StatusBadge'
import type { Delivery } from '@/types/models'

export function DeliveryDetailsDialog({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  if (!delivery) return null

  const totalQty = delivery.items.reduce((sum, i) => sum + i.quantity, 0)
  const totalCrates = delivery.items.reduce((sum, i) => sum + i.crates_qty, 0)

  return (
    <Dialog open={!!delivery} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Order details</DialogTitle>
      <DialogContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack>
            <Typography fontWeight={500}>{delivery.vendor_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {delivery.order_no}
              {delivery.zone ? ` · ${delivery.zone === 'zone_1' ? 'Zone 1' : 'Zone 2'}` : ''}
              {delivery.truck_number ? ` · ${delivery.truck_number}` : ''}
            </Typography>
          </Stack>
          <StatusBadge status={delivery.status} />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Qty (pkt)</TableCell>
              <TableCell align="right">Crates</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {delivery.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No products on this order
                </TableCell>
              </TableRow>
            )}
            {delivery.items.map((item) => (
              <TableRow key={item.product_id}>
                <TableCell>{item.product_name}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">{item.crates_qty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack direction="row" justifyContent="flex-end" spacing={3} sx={{ mt: 1.5, pr: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            Total: {totalQty} pkt · {totalCrates} crates
          </Typography>
        </Stack>

        {delivery.extra_items.length > 0 && (
          <Stack sx={{ mt: 2.5 }}>
            <Typography fontWeight={500} fontSize={13.5} sx={{ mb: 1 }}>
              Extra items requested
            </Typography>
            <Stack spacing={0.5}>
              {delivery.extra_items.map((x) => (
                <Typography key={x.id} variant="body2" color="text.secondary">
                  {x.quantity} pkt · requested by {x.requested_by}
                </Typography>
              ))}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
