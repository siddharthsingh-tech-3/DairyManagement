import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkCreateProducts, type ProductPayload } from '@/api/products'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { CategorySelect } from '@/components/CategorySelect'

const rowSchema = z.object({
  sku: z.string().min(1, 'Required'),
  name: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  hsn_code: z.string().min(1, 'Required'),
  rate: z.coerce.number().positive('> 0'),
  gst_percent: z.coerce.number().min(0).max(100),
  current_stock: z.coerce.number().min(0),
})

const schema = z.object({ rows: z.array(rowSchema).min(1) })
type FormValues = z.infer<typeof schema>

const blankRow = { sku: '', name: '', category: '', hsn_code: '', rate: 0, gst_percent: 5, current_stock: 0 }

export function QuickAddItemsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rows: [blankRow, blankRow, blankRow] } })

  const { fields, append, remove } = useFieldArray({ control, name: 'rows' })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const items: ProductPayload[] = values.rows.map((r) => ({
        sku: r.sku,
        name: r.name,
        category: r.category,
        hsn_code: r.hsn_code,
        rate: r.rate,
        gst_percent: r.gst_percent,
        reorder_level: 0,
        current_stock: r.current_stock,
      }))
      return bulkCreateProducts(items)
    },
    onSuccess: async (created) => {
      toast(`${created.length} items added`)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      reset({ rows: [blankRow, blankRow, blankRow] })
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const handleClose = () => {
    reset({ rows: [blankRow, blankRow, blankRow] })
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Add items</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Quickly add multiple items at once — fill in a row per item.
        </Typography>
        <Stack spacing={1.5}>
          {fields.map((field, index) => (
            <Stack key={field.id} direction="row" spacing={1} alignItems="flex-start">
              <TextField
                size="small"
                label="Item code"
                sx={{ width: 120 }}
                {...register(`rows.${index}.sku`)}
                error={!!errors.rows?.[index]?.sku}
              />
              <TextField
                size="small"
                label="Name"
                sx={{ flex: 1.5 }}
                {...register(`rows.${index}.name`)}
                error={!!errors.rows?.[index]?.name}
              />
              <Controller
                control={control}
                name={`rows.${index}.category`}
                render={({ field }) => (
                  <CategorySelect
                    value={field.value || null}
                    onChange={(name) => field.onChange(name ?? '')}
                    error={!!errors.rows?.[index]?.category}
                    sx={{ width: 160 }}
                  />
                )}
              />
              <TextField
                size="small"
                label="HSN"
                sx={{ width: 100 }}
                {...register(`rows.${index}.hsn_code`)}
                error={!!errors.rows?.[index]?.hsn_code}
              />
              <TextField
                size="small"
                label="Selling price"
                type="number"
                sx={{ width: 120 }}
                {...register(`rows.${index}.rate`)}
                error={!!errors.rows?.[index]?.rate}
              />
              <TextField size="small" label="GST %" type="number" sx={{ width: 90 }} {...register(`rows.${index}.gst_percent`)} />
              <TextField
                size="small"
                label="Opening stock"
                type="number"
                sx={{ width: 120 }}
                {...register(`rows.${index}.current_stock`)}
              />
              <IconButton size="small" onClick={() => remove(index)} disabled={fields.length === 1} sx={{ mt: 0.5 }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        <Box sx={{ mt: 1.5 }}>
          <Button startIcon={<AddIcon />} onClick={() => append(blankRow)} size="small">
            Add another row
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          Add {fields.length} items
        </Button>
      </DialogActions>
    </Dialog>
  )
}
