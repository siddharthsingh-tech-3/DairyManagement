import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, TextField } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recordPayment } from '@/api/billing'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const schema = z.object({
  amount: z.coerce.number().gt(0, 'Enter an amount greater than 0'),
  tds_amount: z.coerce.number().min(0, 'TDS cannot be negative').optional(),
  method: z.enum(['upi', 'cod', 'pay_later', 'cash', 'bank']),
  reference: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function RecordVendorPaymentDialog({
  open,
  onClose,
  vendorId,
}: {
  open: boolean
  onClose: () => void
  vendorId: string
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { method: 'cash' } })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      recordPayment({
        vendor_id: vendorId,
        amount: values.amount,
        tds_amount: values.tds_amount || 0,
        method: values.method,
        reference: values.reference || null,
      }),
    onSuccess: async () => {
      toast('Payment recorded')
      await queryClient.invalidateQueries({ queryKey: ['vendors'] })
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      reset()
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Record payment</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <TextField
              label="Amount (₹)"
              type="number"
              fullWidth
              {...register('amount')}
              error={!!errors.amount}
              helperText={errors.amount?.message}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <TextField select label="Method" fullWidth {...field}>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="bank">Bank Transfer</MenuItem>
                  <MenuItem value="cod">Cash on Delivery</MenuItem>
                  <MenuItem value="pay_later">Pay Later</MenuItem>
                </TextField>
              )}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label="TDS deducted by party (₹, optional)"
              type="number"
              fullWidth
              {...register('tds_amount')}
              error={!!errors.tds_amount}
              helperText={errors.tds_amount?.message}
            />
          </Grid>
          <Grid size={12}>
            <TextField label="Reference (optional)" fullWidth {...register('reference')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          Record
        </Button>
      </DialogActions>
    </Dialog>
  )
}
