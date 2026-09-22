import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postReconciliation } from '@/api/crates'
import { listVendors } from '@/api/vendors'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const schema = z.object({
  vendor_id: z.string().min(1, 'Select a vendor'),
  txn_type: z.enum(['issue', 'return', 'damage', 'adjustment']),
  quantity: z.coerce.number().positive('Enter a quantity'),
  note: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ReconcileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors(undefined, false) })

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { txn_type: 'adjustment' } })

  const mutation = useMutation({
    mutationFn: postReconciliation,
    onSuccess: async (_, variables) => {
      toast(`Adjustment posted — ${variables.txn_type} ${variables.quantity} crates`)
      await queryClient.invalidateQueries({ queryKey: ['crates'] })
      reset()
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Manual reconciliation</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <Controller
              name="vendor_id"
              control={control}
              render={({ field }) => (
                <TextField select label="Vendor" fullWidth {...field} error={!!errors.vendor_id} helperText={errors.vendor_id?.message}>
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={7}>
            <Controller
              name="txn_type"
              control={control}
              render={({ field }) => (
                <TextField select label="Transaction type" fullWidth {...field}>
                  <MenuItem value="issue">Issue</MenuItem>
                  <MenuItem value="return">Return</MenuItem>
                  <MenuItem value="damage">Damage</MenuItem>
                  <MenuItem value="adjustment">Adjustment</MenuItem>
                </TextField>
              )}
            />
          </Grid>
          <Grid size={5}>
            <TextField label="Crates" type="number" fullWidth {...register('quantity')} error={!!errors.quantity} helperText={errors.quantity?.message} />
          </Grid>
          <Grid size={12}>
            <TextField label="Reason / comment" fullWidth {...register('note')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          Post adjustment
        </Button>
      </DialogActions>
    </Dialog>
  )
}
