import { useQuery } from '@tanstack/react-query'
import {
  Box,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { listProducts } from '@/api/products'
import type { Product } from '@/types/models'
import { formatCurrencyPrecise } from '@/utils/format'

export interface PurchaseLineItemDraft {
  product_id: string | null
  description: string
  hsn_code: string
  quantity: number
  rate: number
  discount_percent: number
  tax_percent: number
}

export const emptyLineItem: PurchaseLineItemDraft = {
  product_id: null,
  description: '',
  hsn_code: '',
  quantity: 1,
  rate: 0,
  discount_percent: 0,
  tax_percent: 0,
}

/** Builds a line-item draft from a selected product, used both by the manual
 * item picker below and the barcode scanner. */
export function lineItemFromProduct(product: Product): PurchaseLineItemDraft {
  return {
    ...emptyLineItem,
    product_id: product.id,
    description: product.name,
    hsn_code: product.hsn_code,
    rate: Number(product.rate),
    tax_percent: Number(product.gst_percent),
  }
}

function lineAmount(item: PurchaseLineItemDraft, showDiscount: boolean): number {
  const base = item.rate * item.quantity * (showDiscount ? 1 - item.discount_percent / 100 : 1)
  return base + (base * item.tax_percent) / 100
}

/** Editable line-item grid shared by Purchase Invoice/Order (discount%) and
 * Purchase Return/Debit Note (no discount%) create forms. */
export function PurchaseLineItemsTable({
  items,
  onChange,
  showDiscount = true,
}: {
  items: PurchaseLineItemDraft[]
  onChange: (items: PurchaseLineItemDraft[]) => void
  /** Purchase Return / Debit Note items don't carry a discount%. */
  showDiscount?: boolean
}) {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const updateItem = (index: number, patch: Partial<PurchaseLineItemDraft>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) {
      updateItem(index, { product_id: null })
      return
    }
    updateItem(index, lineItemFromProduct(product))
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <Box>
      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={36}>No.</TableCell>
              <TableCell>Item/Service</TableCell>
              <TableCell width={100}>HSN/SAC</TableCell>
              <TableCell width={80} align="right">
                Qty
              </TableCell>
              <TableCell width={110} align="right">
                Price/Item
              </TableCell>
              {showDiscount && (
                <TableCell width={90} align="right">
                  Discount %
                </TableCell>
              )}
              <TableCell width={80} align="right">
                Tax %
              </TableCell>
              <TableCell width={110} align="right">
                Amount
              </TableCell>
              <TableCell width={40} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={showDiscount ? 9 : 8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No items added yet
                </TableCell>
              </TableRow>
            )}
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={item.product_id ?? ''}
                    onChange={(e) => selectProduct(index, e.target.value)}
                    SelectProps={{ displayEmpty: true }}
                  >
                    <MenuItem value="" disabled>
                      Select item
                    </MenuItem>
                    {products.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={item.hsn_code}
                    onChange={(e) => updateItem(index, { hsn_code: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                    slotProps={{ htmlInput: { min: 1, style: { textAlign: 'right' } } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(index, { rate: Number(e.target.value) })}
                    slotProps={{ htmlInput: { min: 0, style: { textAlign: 'right' } } }}
                  />
                </TableCell>
                {showDiscount && (
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={item.discount_percent}
                      onChange={(e) => updateItem(index, { discount_percent: Number(e.target.value) })}
                      slotProps={{ htmlInput: { min: 0, max: 100, style: { textAlign: 'right' } } }}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    value={item.tax_percent}
                    onChange={(e) => updateItem(index, { tax_percent: Number(e.target.value) })}
                    slotProps={{ htmlInput: { min: 0, max: 100, style: { textAlign: 'right' } } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={500} fontSize={13}>
                    {formatCurrencyPrecise(lineAmount(item, showDiscount))}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <IconButton
        size="small"
        color="primary"
        onClick={() => onChange([...items, { ...emptyLineItem }])}
        sx={{ mt: 1 }}
      >
        <AddIcon fontSize="small" />
        <Typography fontSize={13} fontWeight={500} sx={{ ml: 0.5 }}>
          Add Item
        </Typography>
      </IconButton>
    </Box>
  )
}
