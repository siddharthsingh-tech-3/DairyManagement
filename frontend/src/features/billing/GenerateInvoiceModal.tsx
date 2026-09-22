import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, MenuItem, TextField } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { generateInvoice } from '@/api/billing'
import { listVendors } from '@/api/vendors'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const schema = z.object({
  vendor_id: z.string().min(1, 'Select a vendor'),
  period_month: z.string().min(1),
})
type FormValues = z.infer<typeof schema>

export function GenerateInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors(undefined, false) })

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { period_month: dayjs().format('YYYY-MM') } })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => generateInvoice(values.vendor_id, values.period_month),
    onSuccess: async () => {
      toast('Invoice generated')
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Generate invoice</DialogTitle>
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
          <Grid size={12}>
            <TextField type="month" label="Billing period" fullWidth InputLabelProps={{ shrink: true }} {...register('period_month')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate({ ...v, period_month: `${v.period_month}-01` }))}>
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  )
}
