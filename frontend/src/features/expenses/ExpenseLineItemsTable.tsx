import { IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

export interface ExpenseLineItemDraft {
  description: string
  amount: number
  tax_percent: number
}

export const emptyExpenseLineItem: ExpenseLineItemDraft = { description: '', amount: 0, tax_percent: 0 }

interface ExpenseLineItemsTableProps {
  items: ExpenseLineItemDraft[]
  onChange: (items: ExpenseLineItemDraft[]) => void
  showTax: boolean
}

export function ExpenseLineItemsTable({ items, onChange, showTax }: ExpenseLineItemsTableProps) {
  const update = (index: number, patch: Partial<ExpenseLineItemDraft>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeRow = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [{ ...emptyExpenseLineItem }])
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Item / Description</TableCell>
          <TableCell align="right" sx={{ width: 140 }}>
            Amount
          </TableCell>
          {showTax && (
            <TableCell align="right" sx={{ width: 100 }}>
              Tax %
            </TableCell>
          )}
          <TableCell sx={{ width: 48 }} />
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={index}>
            <TableCell>
              <TextField
                variant="standard"
                fullWidth
                placeholder="Item name / description"
                value={item.description}
                onChange={(e) => update(index, { description: e.target.value })}
              />
            </TableCell>
            <TableCell align="right">
              <TextField
                variant="standard"
                type="number"
                fullWidth
                value={item.amount || ''}
                onChange={(e) => update(index, { amount: Number(e.target.value) })}
                slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
              />
            </TableCell>
            {showTax && (
              <TableCell align="right">
                <TextField
                  variant="standard"
                  type="number"
                  fullWidth
                  value={item.tax_percent || ''}
                  onChange={(e) => update(index, { tax_percent: Number(e.target.value) })}
                  slotProps={{ htmlInput: { style: { textAlign: 'right' } } }}
                />
              </TableCell>
            )}
            <TableCell>
              {items.length > 1 && (
                <IconButton size="small" onClick={() => removeRow(index)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableBody>
        <TableRow>
          <TableCell colSpan={showTax ? 4 : 3} sx={{ border: 0, pt: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ cursor: 'pointer', color: 'primary.main' }}
              onClick={() => onChange([...items, { ...emptyExpenseLineItem }])}
            >
              <AddIcon fontSize="small" />
              <span>Add Item</span>
            </Stack>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
