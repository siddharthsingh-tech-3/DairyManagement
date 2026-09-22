import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser } from '@/api/users'
import { listVendors } from '@/api/vendors'
import { listDrivers } from '@/api/drivers'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const schema = z
  .object({
    full_name: z.string().min(1, 'Required'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    role: z.enum(['super_admin', 'vendor', 'driver']),
    vendor_id: z.string().optional(),
    driver_id: z.string().optional(),
  })
  .refine((v) => v.role !== 'vendor' || !!v.vendor_id, { message: 'Select a vendor', path: ['vendor_id'] })
  .refine((v) => v.role !== 'driver' || !!v.driver_id, { message: 'Select a driver', path: ['driver_id'] })

type FormValues = z.infer<typeof schema>

export function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors(undefined, false) })
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: listDrivers })

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'vendor' } })

  const role = watch('role')

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      toast('New staff invite drafted')
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Add user</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <TextField label="Full name" fullWidth {...register('full_name')} error={!!errors.full_name} helperText={errors.full_name?.message} />
          </Grid>
          <Grid size={6}>
            <TextField label="Email" fullWidth {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
          </Grid>
          <Grid size={6}>
            <TextField label="Temporary password" type="password" fullWidth {...register('password')} error={!!errors.password} helperText={errors.password?.message} />
          </Grid>
          <Grid size={12}>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField select label="Role" fullWidth {...field}>
                  <MenuItem value="super_admin">Admin</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                  <MenuItem value="driver">Truck Owner</MenuItem>
                </TextField>
              )}
            />
          </Grid>
          {role === 'vendor' && (
            <Grid size={12}>
              <Controller
                name="vendor_id"
                control={control}
                render={({ field }) => (
                  <TextField select label="Linked vendor" fullWidth {...field} error={!!errors.vendor_id} helperText={errors.vendor_id?.message}>
                    {vendors.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
          )}
          {role === 'driver' && (
            <Grid size={12}>
              <Controller
                name="driver_id"
                control={control}
                render={({ field }) => (
                  <TextField select label="Linked driver" fullWidth {...field} error={!!errors.driver_id} helperText={errors.driver_id?.message}>
                    {drivers.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </TextField>
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
          Add user
        </Button>
      </DialogActions>
    </Dialog>
  )
}
