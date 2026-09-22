import { useState } from 'react'
import { Divider, MenuItem, Stack, TextField } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listVendors } from '@/api/vendors'
import { VendorFormDialog } from '@/features/vendors/VendorFormDialog'

/** Vendor picker scoped to customers (is_supplier=false), with an inline "add new
 * customer" shortcut so a Sales document can be raised without leaving the form. */
export function CustomerSelectField({
  value,
  onChange,
  label = 'Bill To',
  error,
  helperText,
}: {
  value: string
  onChange: (vendorId: string) => void
  label?: string
  error?: boolean
  helperText?: string
}) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const { data: customers = [] } = useQuery({
    queryKey: ['vendors', 'customers'],
    queryFn: () => listVendors(undefined, false),
  })

  return (
    <Stack spacing={1}>
      <TextField
        select
        label={label}
        fullWidth
        value={value}
        onChange={(e) => {
          if (e.target.value === '__add_new__') {
            setAddOpen(true)
            return
          }
          onChange(e.target.value)
        }}
        error={error}
        helperText={helperText}
        InputLabelProps={{ shrink: true }}
        SelectProps={{ displayEmpty: true }}
      >
        <MenuItem value="" disabled>
          Add Party
        </MenuItem>
        {customers.length === 0 && (
          <MenuItem value="__no_customers__" disabled sx={{ whiteSpace: 'normal', fontStyle: 'italic' }}>
            No customers yet — use "Create Party" below to add whoever you sell to.
          </MenuItem>
        )}
        {customers.map((v) => (
          <MenuItem key={v.id} value={v.id}>
            {v.name}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem value="__add_new__" sx={{ color: 'primary.main', fontWeight: 500 }}>
          <AddCircleOutlineIcon fontSize="small" sx={{ mr: 1 }} />
          Create Party
        </MenuItem>
      </TextField>
      <VendorFormDialog
        open={addOpen}
        onClose={async () => {
          setAddOpen(false)
          await queryClient.invalidateQueries({ queryKey: ['vendors', 'customers'] })
        }}
      />
    </Stack>
  )
}
