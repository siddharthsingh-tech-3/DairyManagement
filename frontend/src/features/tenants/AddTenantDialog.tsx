import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, TextField } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTenant } from '@/api/tenants'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  slug: z
    .string()
    .min(1, 'Required')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers, and hyphens only'),
  admin_name: z.string().min(1, 'Required'),
  admin_email: z.string().email('Enter a valid email'),
  admin_password: z.string().min(8, 'At least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export function AddTenantDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: createTenant,
    onSuccess: async () => {
      toast('Tenant provisioned')
      await queryClient.invalidateQueries({ queryKey: ['tenants'] })
      reset()
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Onboard a new tenant</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={6}>
            <TextField
              label="Business name"
              fullWidth
              {...register('name')}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Slug"
              fullWidth
              placeholder="acme-dairy"
              {...register('slug')}
              error={!!errors.slug}
              helperText={errors.slug?.message}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="Admin full name"
              fullWidth
              {...register('admin_name')}
              error={!!errors.admin_name}
              helperText={errors.admin_name?.message}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Admin email"
              fullWidth
              {...register('admin_email')}
              error={!!errors.admin_email}
              helperText={errors.admin_email?.message}
            />
          </Grid>
          <Grid size={6}>
            <TextField
              label="Temporary password"
              type="password"
              fullWidth
              {...register('admin_password')}
              error={!!errors.admin_password}
              helperText={errors.admin_password?.message}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          Create tenant
        </Button>
      </DialogActions>
    </Dialog>
  )
}
