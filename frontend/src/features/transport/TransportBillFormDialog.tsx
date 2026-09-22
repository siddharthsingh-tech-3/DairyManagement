import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, Stack, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createTransportBill, updateTransportBill } from '@/api/transportBills'
import { listTransports } from '@/api/transports'
import { TransportZoneSelect } from '@/features/transport/TransportZoneSelect'
import { PurchaseItemCategorySelect } from '@/features/transport/PurchaseItemCategorySelect'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { TransportBill } from '@/types/models'

const schema = z.object({
  bill_date: z.string().min(1, 'Required'),
  transport_id: z.string().min(1, 'Required'),
  zone_id: z.string().min(1, 'Required'),
  purchase_item_category_id: z.string().min(1, 'Required'),
  bill_number: z.string().optional(),
  amount: z.coerce.number().min(0, 'Must be 0 or more'),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  bill_date: dayjs().format('YYYY-MM-DD'),
  transport_id: '',
  zone_id: '',
  purchase_item_category_id: '',
  bill_number: '',
  amount: 0,
}

export function TransportBillFormDialog({
  open,
  onClose,
  bill,
}: {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this bill instead of creating a new one. */
  bill?: TransportBill | null
}) {
  const isEdit = !!bill
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: transports = [] } = useQuery({ queryKey: ['transports'], queryFn: listTransports })

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    if (bill) {
      reset({
        bill_date: bill.bill_date,
        transport_id: bill.transport_id,
        zone_id: bill.zone_id,
        purchase_item_category_id: bill.purchase_item_category_id,
        bill_number: bill.bill_number ?? '',
        amount: Number(bill.amount),
      })
    } else {
      reset(emptyValues)
    }
  }, [open, bill, reset])

  const selectedTransportId = watch('transport_id')
  const selectedTransport = transports.find((t) => t.id === selectedTransportId) ?? null

  const toPayload = (values: FormValues) => ({ ...values, bill_number: values.bill_number || null })

  const createMutation = useMutation({ mutationFn: (values: FormValues) => createTransportBill(toPayload(values)) })
  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => updateTransportBill(bill!.id, toPayload(values)),
  })
  const mutation = isEdit ? updateMutation : createMutation

  const submit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync(values)
      toast(isEdit ? 'Transport bill updated' : 'Transport bill added')
      await queryClient.invalidateQueries({ queryKey: ['transport-bills'] })
      onClose()
    } catch (error) {
      toast(extractErrorMessage(error), 'error')
    }
  }

  const handleClose = () => {
    reset(emptyValues)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{isEdit ? 'Edit Transport Bill' : 'Add Transport Bill'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField
                label="Bill Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register('bill_date')}
                error={!!errors.bill_date}
                helperText={errors.bill_date?.message}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="transport_id"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={transports}
                    value={transports.find((t) => t.id === field.value) ?? null}
                    getOptionLabel={(t) => `${t.name} (${t.vehicle_number})`}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    onChange={(_, value) => field.onChange(value?.id ?? '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Transport" error={!!errors.transport_id} helperText={errors.transport_id?.message} />
                    )}
                  />
                )}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Vehicle Number"
                fullWidth
                disabled
                value={selectedTransport?.vehicle_number ?? ''}
                helperText="Auto-filled from the selected transport"
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="zone_id"
                control={control}
                render={({ field }) => (
                  <TransportZoneSelect
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? '')}
                    required
                    error={!!errors.zone_id}
                    helperText={errors.zone_id?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="purchase_item_category_id"
                control={control}
                render={({ field }) => (
                  <PurchaseItemCategorySelect
                    value={field.value || null}
                    onChange={(id) => field.onChange(id ?? '')}
                    required
                    error={!!errors.purchase_item_category_id}
                    helperText={errors.purchase_item_category_id?.message}
                  />
                )}
              />
            </Grid>
            <Grid size={6}>
              <TextField label="Bill Number" fullWidth {...register('bill_number')} />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                {...register('amount')}
                error={!!errors.amount}
                helperText={errors.amount?.message}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit(submit)}>
          {isEdit ? 'Save Changes' : 'Save Bill'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
