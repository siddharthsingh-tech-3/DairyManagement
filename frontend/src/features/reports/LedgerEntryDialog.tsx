import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, TextField } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createLedgerEntry } from '@/api/reports'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { LedgerEntryCategory } from '@/types/enums'

const schema = z.object({
  label: z.string().min(1, 'Required'),
  amount: z.coerce.number().gt(0, 'Enter an amount greater than 0'),
  entry_date: z.string().min(1, 'Required'),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const CATEGORY_LABELS: Record<LedgerEntryCategory, string> = {
  capital: 'Capital',
  loans: 'Loans',
  fixed_assets: 'Fixed Assets',
  investments: 'Investments',
  loans_advance: 'Loans Advance',
}

export function LedgerEntryDialog({
  open,
  onClose,
  category,
}: {
  open: boolean
  onClose: () => void
  category: LedgerEntryCategory
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { label: '', amount: 0, entry_date: dayjs().format('YYYY-MM-DD'), note: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createLedgerEntry({
        category,
        label: values.label,
        amount: values.amount,
        entry_date: values.entry_date,
        note: values.note || null,
      }),
    onSuccess: async () => {
      toast(`${CATEGORY_LABELS[category]} entry added`)
      await queryClient.invalidateQueries({ queryKey: ['balance-sheet'] })
      reset()
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Add {CATEGORY_LABELS[category]} Entry</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={12}>
            <TextField
              label="Label"
              fullWidth
              {...register('label')}
              error={!!errors.label}
              helperText={errors.label?.message}
            />
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
          <Grid size={6}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('entry_date')}
              error={!!errors.entry_date}
              helperText={errors.entry_date?.message}
            />
          </Grid>
          <Grid size={12}>
            <TextField label="Note (optional)" fullWidth multiline minRows={2} {...register('note')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => mutation.mutate(v))}>
          Add entry
        </Button>
      </DialogActions>
    </Dialog>
  )
}
