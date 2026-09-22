import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recordLoanRepayment } from '@/api/loans'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrencyPrecise } from '@/utils/format'
import type { Loan, LoanScheduleInstallment } from '@/types/models'

const schema = z
  .object({
    payment_date: z.string().min(1, 'Required'),
    method: z.enum(['upi', 'cod', 'pay_later', 'cash', 'bank']),
    principal_amount: z.coerce.number().min(0).optional(),
    interest_amount: z.coerce.number().min(0).optional(),
    tax_amount: z.coerce.number().min(0).optional(),
    tax_deduction_date: z.string().optional(),
    tax_reference: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => (v.principal_amount ?? 0) + (v.interest_amount ?? 0) + (v.tax_amount ?? 0) > 0, {
    message: 'Enter at least one of principal, interest or tax amount',
    path: ['principal_amount'],
  })

type FormValues = z.infer<typeof schema>

export function LoanPaymentDialog({
  open,
  onClose,
  loan,
  installment,
}: {
  open: boolean
  onClose: () => void
  loan: Loan
  /** When set, the payment is applied to this specific installment; otherwise it's a
   * lump-sum payment the server applies FIFO across unpaid installments. */
  installment?: LoanScheduleInstallment | null
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { method: 'bank' } })

  useEffect(() => {
    if (!open) return
    // Only pre-fill from the installment's scheduled split when nothing has been paid
    // against it yet — once it's partially paid, the principal/interest split of what's
    // left is ambiguous, so leave the fields blank for the user to enter explicitly.
    const prefill = installment && Number(installment.paid_amount) === 0
    // Tax is withheld FROM the scheduled interest, not added on top of it, so the
    // interest field pre-fills with the net amount (gross interest minus the tax portion).
    reset({
      method: 'bank',
      principal_amount: prefill ? Number(installment.principal_component) : undefined,
      interest_amount: prefill ? Number(installment.interest_component) - Number(installment.tax_component) : undefined,
      tax_amount: prefill ? Number(installment.tax_component) : undefined,
    })
  }, [open, installment, reset])

  const principal = watch('principal_amount') ?? 0
  const interest = watch('interest_amount') ?? 0
  const tax = watch('tax_amount') ?? 0
  const total = Number(principal) + Number(interest) + Number(tax)

  const outstandingPrincipal = Number(loan.outstanding_principal)
  const outstandingInterest = Number(loan.outstanding_interest)
  const exceedsPrincipal = Number(principal) > outstandingPrincipal
  const exceedsInterest = Number(interest) + Number(tax) > outstandingInterest

  const mutation = useMutation({ mutationFn: (payload: Parameters<typeof recordLoanRepayment>[1]) => recordLoanRepayment(loan.id, payload) })

  const submit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync({
        installment_id: installment?.id ?? null,
        payment_date: values.payment_date,
        method: values.method,
        principal_amount: values.principal_amount || 0,
        interest_amount: values.interest_amount || 0,
        tax_amount: values.tax_amount || 0,
        tax_deduction_date: values.tax_deduction_date || null,
        tax_reference: values.tax_reference || null,
        reference: values.reference || null,
        notes: values.notes || null,
      })
      toast('Repayment recorded')
      await queryClient.invalidateQueries({ queryKey: ['loans'] })
      await queryClient.invalidateQueries({ queryKey: ['loans', loan.id] })
      onClose()
    } catch (error) {
      toast(extractErrorMessage(error), 'error')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 600 }}>
        Record {loan.loan_type === 'taken' ? 'Repayment' : 'Collection'}
        {installment ? ` — Installment #${installment.installment_number}` : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Outstanding Principal: <strong>{formatCurrencyPrecise(loan.outstanding_principal)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Outstanding Interest: <strong>{formatCurrencyPrecise(loan.outstanding_interest)}</strong>
            </Typography>
          </Box>

          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Principal Amount (₹)"
                  type="number"
                  fullWidth
                  {...register('principal_amount')}
                  error={!!errors.principal_amount || exceedsPrincipal}
                  helperText={errors.principal_amount?.message ?? (exceedsPrincipal ? 'Exceeds outstanding principal' : ' ')}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Interest Amount (₹)"
                  type="number"
                  fullWidth
                  {...register('interest_amount')}
                  error={exceedsInterest}
                  helperText={exceedsInterest ? 'Exceeds outstanding interest' : ' '}
                />
              </Grid>
              <Grid size={6}>
                <TextField label="Tax/TDS Amount (₹)" type="number" fullWidth {...register('tax_amount')} />
              </Grid>
              <Grid size={6}>
                <TextField label="Total" fullWidth disabled value={formatCurrencyPrecise(total || 0)} />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Payment Date"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('payment_date')}
                  error={!!errors.payment_date}
                  helperText={errors.payment_date?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField select label="Payment Method" fullWidth {...register('method')}>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="bank">Bank</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="cod">COD</MenuItem>
                  <MenuItem value="pay_later">Pay Later</MenuItem>
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Reference / UTR No." fullWidth {...register('reference')} />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Tax Deduction Date"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('tax_deduction_date')}
                />
              </Grid>
              <Grid size={12}>
                <TextField label="Tax Reference / Challan No." fullWidth {...register('tax_reference')} />
              </Grid>
              <Grid size={12}>
                <TextField label="Notes" fullWidth multiline minRows={2} {...register('notes')} />
              </Grid>
            </Grid>
          </Box>

          {(exceedsPrincipal || exceedsInterest) && (
            <Alert severity="error">This payment exceeds the loan's outstanding balance.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={mutation.isPending || exceedsPrincipal || exceedsInterest}
          onClick={handleSubmit(submit)}
        >
          Save Payment
        </Button>
      </DialogActions>
    </Dialog>
  )
}
