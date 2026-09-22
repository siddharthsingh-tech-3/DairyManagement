import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { markDelivered, type ExtraItemPayload } from '@/api/deliveries'
import { listProducts } from '@/api/products'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { Delivery } from '@/types/models'

interface LocalExtra extends ExtraItemPayload {
  crates_qty: number
}

export function MarkDeliveredModal({ delivery, onClose }: { delivery: Delivery | null; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const [itemExtras, setItemExtras] = useState<Record<string, number>>({})
  const [itemCrateExtras, setItemCrateExtras] = useState<Record<string, number>>({})
  const [cratesIn, setCratesIn] = useState(0)
  const [extras, setExtras] = useState<LocalExtra[]>([])
  const [newProduct, setNewProduct] = useState('')
  const [newQty, setNewQty] = useState(10)
  const [newCrates, setNewCrates] = useState(0)

  useEffect(() => {
    if (!delivery) return
    setItemExtras(Object.fromEntries(delivery.items.map((i) => [i.product_id, 0])))
    setItemCrateExtras(Object.fromEntries(delivery.items.map((i) => [i.product_id, 0])))
    setCratesIn(0)
    setExtras([])
    setNewProduct('')
    setNewQty(10)
    setNewCrates(0)
  }, [delivery])

  const orderedQtyTotal = delivery?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  const orderedCratesTotal = delivery?.items.reduce((sum, i) => sum + i.crates_qty, 0) ?? 0
  const itemExtraQtyTotal = Object.values(itemExtras).reduce((sum, q) => sum + (q || 0), 0)
  const itemExtraCratesTotal = Object.values(itemCrateExtras).reduce((sum, q) => sum + (q || 0), 0)
  const freeExtraQtyTotal = extras.reduce((sum, x) => sum + x.quantity, 0)
  const freeExtraCratesTotal = extras.reduce((sum, x) => sum + x.crates_qty, 0)

  const deliveredTotal = orderedQtyTotal + itemExtraQtyTotal + freeExtraQtyTotal
  const cratesOutTotal = orderedCratesTotal + itemExtraCratesTotal + freeExtraCratesTotal

  const availableProducts = products.filter((p) => !delivery?.items.some((i) => i.product_id === p.id))

  const mutation = useMutation({
    mutationFn: () =>
      markDelivered(delivery!.id, {
        delivered_quantity: deliveredTotal,
        crates_out: cratesOutTotal,
        crates_in: cratesIn,
        extra_items: [
          ...Object.entries(itemExtras)
            .filter(([, qty]) => qty > 0)
            .map(([product_id, quantity]) => ({ product_id, quantity })),
          ...extras.map(({ product_id, quantity }) => ({ product_id, quantity })),
        ],
      }),
    onSuccess: async () => {
      toast(`${delivery?.vendor_name} marked delivered — awaiting vendor confirmation`)
      await queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  if (!delivery) return null

  return (
    <Dialog open={!!delivery} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Update delivery</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {delivery.vendor_name} · {delivery.order_no}
        </Typography>

        <Typography fontWeight={600} fontSize={13.5} sx={{ mb: 1 }}>
          Ordered products
        </Typography>
        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          {delivery.items.map((item) => (
            <Stack key={item.product_id} direction="row" alignItems="center" spacing={1.5}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {item.product_name}{' '}
                <Typography component="span" color="text.secondary">
                  · ordered {item.quantity} pkt / {item.crates_qty} crates
                </Typography>
              </Typography>
              <TextField
                label="Extra pkt"
                size="small"
                type="number"
                value={itemExtras[item.product_id] ?? 0}
                onChange={(e) =>
                  setItemExtras((prev) => ({ ...prev, [item.product_id]: Math.max(0, Number(e.target.value)) }))
                }
                sx={{ width: 110 }}
              />
              <TextField
                label="Extra crates"
                size="small"
                type="number"
                value={itemCrateExtras[item.product_id] ?? 0}
                onChange={(e) =>
                  setItemCrateExtras((prev) => ({ ...prev, [item.product_id]: Math.max(0, Number(e.target.value)) }))
                }
                sx={{ width: 110 }}
              />
            </Stack>
          ))}
          {delivery.items.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No products on this order
            </Typography>
          )}
        </Stack>

        <Grid container spacing={2}>
          <Grid size={6}>
            <TextField label="Crates out" type="number" fullWidth value={cratesOutTotal} slotProps={{ input: { readOnly: true } }} />
          </Grid>
          <Grid size={6}>
            <TextField label="Empties in" type="number" fullWidth value={cratesIn} onChange={(e) => setCratesIn(Number(e.target.value))} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2.5, p: 2, border: '1px dashed', borderColor: 'primary.light', borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography fontWeight={600} fontSize={13.5} color="primary.dark" sx={{ mb: 1.5 }}>
            Add a product not on this order
          </Typography>
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            {extras.map((x, i) => {
              const product = products.find((p) => p.id === x.product_id)
              return (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1.5 }}>
                  <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                    {x.quantity} pkt / {x.crates_qty} crates · {product?.name}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => setExtras((prev) => prev.filter((_, idx) => idx !== i))}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )
            })}
          </Stack>
          {availableProducts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              All products are already on this order.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1}>
              <TextField select label="Product" size="small" fullWidth value={newProduct} onChange={(e) => setNewProduct(e.target.value)}>
                {availableProducts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Qty" size="small" type="number" value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} sx={{ width: 90 }} />
              <TextField
                label="Crates"
                size="small"
                type="number"
                value={newCrates}
                onChange={(e) => setNewCrates(Number(e.target.value))}
                sx={{ width: 90 }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  if (!newProduct || !newQty) return
                  setExtras((prev) => [...prev, { product_id: newProduct, quantity: newQty, crates_qty: newCrates }])
                  setNewProduct('')
                  setNewQty(10)
                  setNewCrates(0)
                }}
              >
                Add
              </Button>
            </Stack>
          )}
        </Box>

        <Stack direction="row" justifyContent="flex-end" spacing={3} sx={{ mt: 2.5 }}>
          <Typography variant="body2" fontWeight={500}>
            Total delivered: {deliveredTotal} pkt · {cratesOutTotal} crates
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          Mark as delivered
        </Button>
      </DialogActions>
    </Dialog>
  )
}
