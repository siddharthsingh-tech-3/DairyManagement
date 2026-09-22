import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import dayjs from 'dayjs'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid2 as Grid,
  MenuItem,
  Switch,
  TextField,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOffer, updateOffer } from '@/api/offers'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { Offer, Product } from '@/types/models'

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  discount_type: z.enum(['percent', 'flat']),
  discount_value: z.coerce.number().positive('Must be greater than 0'),
  valid_from: z.string().min(1, 'Required'),
  valid_till: z.string().optional(),
  applies_to_all: z.boolean(),
  product_ids: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

const defaults: FormValues = {
  title: '',
  description: '',
  discount_type: 'percent',
  discount_value: 10,
  valid_from: dayjs().format('YYYY-MM-DD'),
  valid_till: '',
  applies_to_all: true,
  product_ids: [],
}

export function OfferFormDialog({
  open,
  onClose,
  offer,
  products,
}: {
  open: boolean
  onClose: () => void
  offer?: Offer | null
  products: Product[]
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const isEdit = !!offer

  const { control, register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (!open) return
    if (offer) {
      reset({
        title: offer.title,
        description: offer.description ?? '',
        discount_type: offer.discount_type,
        discount_value: Number(offer.discount_value),
        valid_from: offer.valid_from,
        valid_till: offer.valid_till ?? '',
        applies_to_all: offer.applies_to_all,
        product_ids: offer.product_ids,
      })
    } else {
      reset(defaults)
    }
  }, [open, offer, reset])

  const appliesToAll = watch('applies_to_all')

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const payload = {
        title: v.title,
        description: v.description || null,
        discount_type: v.discount_type,
        discount_value: v.discount_value,
        valid_from: v.valid_from,
        valid_till: v.valid_till || null,
        applies_to_all: v.applies_to_all,
        product_ids: v.applies_to_all ? [] : v.product_ids,
      }
      return isEdit && offer ? updateOffer(offer.id, payload) : createOffer(payload)
    },
    onSuccess: async () => {
      toast(isEdit ? 'Offer updated' : 'Offer created')
      await queryClient.invalidateQueries({ queryKey: ['offers'] })
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{isEdit ? 'Edit offer' : 'Create offer'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <TextField label="Offer title" fullWidth {...register('title')} error={!!errors.title} helperText={errors.title?.message} />
          </Grid>
          <Grid size={12}>
            <TextField label="Description (optional)" fullWidth multiline minRows={2} {...register('description')} />
          </Grid>
          <Grid size={5}>
            <TextField label="Discount type" select fullWidth {...register('discount_type')}>
              <MenuItem value="percent">Percent off</MenuItem>
              <MenuItem value="flat">Flat amount off</MenuItem>
            </TextField>
          </Grid>
          <Grid size={7}>
            <TextField
              label="Discount value"
              type="number"
              fullWidth
              {...register('discount_value')}
              error={!!errors.discount_value}
              helperText={errors.discount_value?.message}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Valid from"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('valid_from')}
              error={!!errors.valid_from}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Valid till (optional)"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('valid_till')}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              control={control}
              name="applies_to_all"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Apply to all items"
                />
              )}
            />
          </Grid>
          {!appliesToAll && (
            <Grid size={12}>
              <Controller
                control={control}
                name="product_ids"
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={products.map((p) => p.id)}
                    getOptionLabel={(id) => products.find((p) => p.id === id)?.name ?? id}
                    value={field.value}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => <TextField {...params} label="Applies to items" placeholder="Select items" />}
                  />
                )}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          {isEdit ? 'Save changes' : 'Create offer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
