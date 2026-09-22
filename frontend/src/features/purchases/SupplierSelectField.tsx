import { useState } from 'react'
import { Divider, MenuItem, Stack, TextField } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listVendors } from '@/api/vendors'
import { VendorFormDialog } from '@/features/vendors/VendorFormDialog'

/** Vendor picker scoped to suppliers (is_supplier=true), with an inline "add new
 * supplier" shortcut so a Purchases document can be raised without leaving the form. */
export function SupplierSelectField({
  value,
  onChange,
  label = 'Bill From',
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
  const { data: suppliers = [] } = useQuery({
    queryKey: ['vendors', 'suppliers'],
    queryFn: () => listVendors(undefined, true),
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
        {suppliers.length === 0 && (
          <MenuItem value="__no_suppliers__" disabled sx={{ whiteSpace: 'normal', fontStyle: 'italic' }}>
            No suppliers yet — vendors here are set up as customers. Use "Create Party" below to add whoever
            you buy from (e.g. the milk company).
          </MenuItem>
        )}
        {suppliers.map((v) => (
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
          await queryClient.invalidateQueries({ queryKey: ['vendors', 'suppliers'] })
        }}
        defaultIsSupplier
      />
    </Stack>
  )
}
