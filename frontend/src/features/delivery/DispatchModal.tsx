import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, TextField } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dispatchDelivery } from '@/api/deliveries'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const ZONE_OPTIONS = [
  { value: 'zone_1', label: 'Zone 1' },
  { value: 'zone_2', label: 'Zone 2' },
]

const TRUCK_OPTIONS = [
  { value: 'MH12 AB 1234', label: 'MH12 AB 1234' },
  { value: 'MH14 CD 5678', label: 'MH14 CD 5678' },
]

const schema = z.object({
  driver_id: z.string().min(1, 'Select a driver'),
  zone: z.string().min(1, 'Select a zone'),
  truck_number: z.string().min(1, 'Select a truck'),
})
type FormValues = z.infer<typeof schema>

export function DispatchModal({
  deliveryId,
  drivers,
  onClose,
}: {
  deliveryId: string | null
  drivers: { id: string; name: string }[]
  onClose: () => void
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => dispatchDelivery(deliveryId!, values),
    onSuccess: async () => {
      toast('Order dispatched')
      await queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={!!deliveryId} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Dispatch delivery</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <Controller
              name="driver_id"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField select label="Driver" fullWidth {...field} error={!!errors.driver_id} helperText={errors.driver_id?.message}>
                  {drivers.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={6}>
            <Controller
              name="zone"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField select label="Zone" fullWidth {...field} error={!!errors.zone} helperText={errors.zone?.message}>
                  {ZONE_OPTIONS.map((z) => (
                    <MenuItem key={z.value} value={z.value}>
                      {z.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={6}>
            <Controller
              name="truck_number"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField select label="Truck" fullWidth {...field} error={!!errors.truck_number} helperText={errors.truck_number?.message}>
                  {TRUCK_OPTIONS.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          Dispatch
        </Button>
      </DialogActions>
    </Dialog>
  )
}
