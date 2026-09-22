import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, Stack, TextField } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTransport, updateTransport } from '@/api/transports'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { Transport } from '@/types/models'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  vehicle_number: z.string().min(1, 'Required'),
  ownership: z.enum(['own', 'rent']),
  measure: z.string().min(1, 'Required'),
  transport_average: z.coerce.number().min(0, 'Must be 0 or more'),
  diesel_average: z.coerce.number().min(0, 'Must be 0 or more'),
  km_running_track: z.coerce.number().min(0, 'Must be 0 or more'),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  name: '',
  vehicle_number: '',
  ownership: 'own',
  measure: '',
  transport_average: 0,
  diesel_average: 0,
  km_running_track: 0,
}

export function TransportFormDialog({
  open,
  onClose,
  transport,
  readOnly = false,
}: {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits (or views) this transport instead of creating a new one. */
  transport?: Transport | null
  /** Disables all fields and hides Save — doubles this dialog as a View dialog for users without full permission. */
  readOnly?: boolean
}) {
  const isEdit = !!transport
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (!open) return
    if (transport) {
      reset({
        name: transport.name,
        vehicle_number: transport.vehicle_number,
        ownership: transport.ownership,
        measure: transport.measure,
        transport_average: Number(transport.transport_average),
        diesel_average: Number(transport.diesel_average),
        km_running_track: Number(transport.km_running_track),
      })
    } else {
      reset(emptyValues)
    }
  }, [open, transport, reset])

  const createMutation = useMutation({ mutationFn: createTransport })
  const updateMutation = useMutation({
    mutationFn: (payload: FormValues) => updateTransport(transport!.id, payload),
  })
  const mutation = isEdit ? updateMutation : createMutation

  const submit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync(values)
      toast(isEdit ? 'Transport updated' : 'Transport added')
      await queryClient.invalidateQueries({ queryKey: ['transports'] })
      onClose()
    } catch (error) {
      toast(extractErrorMessage(error), 'error')
    }
  }

  const handleClose = () => {
    reset(emptyValues)
    onClose()
  }

  const title = readOnly ? 'View Transport' : isEdit ? 'Edit Transport' : 'Add Transport'

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                label="Transport Name"
                fullWidth
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={readOnly}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Vehicle Number"
                fullWidth
                {...register('vehicle_number')}
                error={!!errors.vehicle_number}
                helperText={errors.vehicle_number?.message}
                disabled={readOnly}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="ownership"
                control={control}
                render={({ field }) => (
                  <TextField select label="Ownership" fullWidth {...field} disabled={readOnly}>
                    <MenuItem value="own">Own</MenuItem>
                    <MenuItem value="rent">Rent</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Measure"
                fullWidth
                {...register('measure')}
                error={!!errors.measure}
                helperText={errors.measure?.message}
                disabled={readOnly}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Transport Average"
                type="number"
                fullWidth
                {...register('transport_average')}
                error={!!errors.transport_average}
                helperText={errors.transport_average?.message}
                disabled={readOnly}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="Diesel Average"
                type="number"
                fullWidth
                {...register('diesel_average')}
                error={!!errors.diesel_average}
                helperText={errors.diesel_average?.message}
                disabled={readOnly}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="KM Running Track"
                type="number"
                fullWidth
                {...register('km_running_track')}
                error={!!errors.km_running_track}
                helperText={errors.km_running_track?.message}
                disabled={readOnly}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && (
          <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit(submit)}>
            {isEdit ? 'Save Changes' : 'Save Transport'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
