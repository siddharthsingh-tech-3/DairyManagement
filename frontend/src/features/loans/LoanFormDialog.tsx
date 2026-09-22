import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLoan, updateLoan, type LoanUpdatePayload } from '@/api/loans'
import { listVendors } from '@/api/vendors'
import { listBusinessPartners } from '@/api/businessPartners'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { LoanDetail } from '@/types/models'

const schema = z
  .object({
    loan_type: z.enum(['taken', 'given']),
    party_type: z.enum(['vendor', 'business_partner', 'other']),
    party_id: z.string().optional(),
    party_name: z.string().optional(),
    principal_amount: z.coerce.number().gt(0, 'Must be greater than 0'),
    loan_date: z.string().min(1, 'Required'),
    disbursement_method: z.enum(['upi', 'cod', 'pay_later', 'cash', 'bank']),
    interest_rate: z.coerce.number().min(0, 'Cannot be negative'),
    interest_type: z.enum(['simple', 'compound']),
    tenure_value: z.coerce.number().gt(0, 'Must be greater than 0'),
    tenure_unit: z.enum(['months', 'years']),
    repayment_frequency: z.enum(['monthly', 'quarterly', 'half_yearly', 'yearly']),
    first_repayment_date: z.string().min(1, 'Required'),
    tax_type: z.string().optional(),
    tax_rate: z.coerce.number().min(0, 'Cannot be negative').optional().or(z.literal(undefined)),
    notes: z.string().optional(),
  })
  .refine((v) => v.party_type !== 'other' || !!v.party_name?.trim(), {
    message: 'Party name is required',
    path: ['party_name'],
  })
  .refine((v) => v.party_type === 'other' || !!v.party_id, {
    message: 'Select a party',
    path: ['party_id'],
  })

type FormValues = z.infer<typeof schema>

const EDIT_SCHEMA = z.object({
  notes: z.string().optional(),
  tax_type: z.string().optional(),
  tax_rate: z.coerce.number().min(0, 'Cannot be negative').optional().or(z.literal(undefined)),
})

type EditFormValues = z.infer<typeof EDIT_SCHEMA>

function CreateLoanForm({ onClose }: { onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      loan_type: 'taken',
      party_type: 'other',
      disbursement_method: 'bank',
      interest_rate: 0,
      interest_type: 'simple',
      tenure_value: 12,
      tenure_unit: 'months',
      repayment_frequency: 'monthly',
    },
  })

  const partyType = watch('party_type')
  const loanDate = watch('loan_date')
  const tenureValue = watch('tenure_value')
  const tenureUnit = watch('tenure_unit')

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => listVendors(),
    enabled: partyType === 'vendor',
  })
  const { data: partners = [] } = useQuery({
    queryKey: ['business-partners'],
    queryFn: () => listBusinessPartners(),
    enabled: partyType === 'business_partner',
  })

  const maturityPreview = (() => {
    if (!loanDate || !tenureValue) return null
    const months = tenureUnit === 'years' ? tenureValue * 12 : tenureValue
    const d = new Date(loanDate)
    d.setMonth(d.getMonth() + months)
    return d.toISOString().slice(0, 10)
  })()

  const mutation = useMutation({ mutationFn: createLoan })

  const submit = async (values: FormValues) => {
    try {
      const tenure_months = Math.round(values.tenure_unit === 'years' ? values.tenure_value * 12 : values.tenure_value)
      await mutation.mutateAsync({
        loan_type: values.loan_type,
        party_type: values.party_type,
        party_id: values.party_type === 'other' ? null : values.party_id,
        party_name: values.party_type === 'other' ? values.party_name : null,
        principal_amount: values.principal_amount,
        loan_date: values.loan_date,
        disbursement_method: values.disbursement_method,
        interest_rate: values.interest_rate,
        interest_type: values.interest_type,
        tenure_months,
        repayment_frequency: values.repayment_frequency,
        first_repayment_date: values.first_repayment_date,
        tax_type: values.tax_type || null,
        tax_rate: values.tax_rate ?? null,
        notes: values.notes || null,
      })
      toast('Loan recorded')
      await queryClient.invalidateQueries({ queryKey: ['loans'] })
      onClose()
    } catch (error) {
      toast(extractErrorMessage(error), 'error')
    }
  }

  return (
    <>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Stack spacing={2.5}>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              Loan Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Controller
                  control={control}
                  name="loan_type"
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      color="primary"
                      value={field.value}
                      onChange={(_, v) => v && field.onChange(v)}
                    >
                      <ToggleButton value="taken">Loan Taken</ToggleButton>
                      <ToggleButton value="given">Loan Given</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
              </Grid>
              <Grid size={4}>
                <TextField select label="Party Type" fullWidth {...register('party_type')}>
                  <MenuItem value="vendor">Vendor</MenuItem>
                  <MenuItem value="business_partner">Business Partner</MenuItem>
                  <MenuItem value="other">Other (Bank / NBFC / Individual)</MenuItem>
                </TextField>
              </Grid>
              {partyType === 'other' ? (
                <Grid size={8}>
                  <TextField
                    label="Party Name"
                    fullWidth
                    {...register('party_name')}
                    error={!!errors.party_name}
                    helperText={errors.party_name?.message}
                  />
                </Grid>
              ) : (
                <Grid size={8}>
                  <TextField
                    select
                    label="Select Party"
                    fullWidth
                    defaultValue=""
                    {...register('party_id')}
                    error={!!errors.party_id}
                    helperText={errors.party_id?.message}
                  >
                    {(partyType === 'vendor' ? vendors : partners).map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              <Grid size={6}>
                <TextField
                  label="Principal Amount (₹)"
                  type="number"
                  fullWidth
                  {...register('principal_amount')}
                  error={!!errors.principal_amount}
                  helperText={errors.principal_amount?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Loan Date"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('loan_date')}
                  error={!!errors.loan_date}
                  helperText={errors.loan_date?.message}
                />
              </Grid>
              <Grid size={12}>
                <TextField select label="Disbursement Account" fullWidth {...register('disbursement_method')}>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="bank">Bank</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="cod">COD</MenuItem>
                  <MenuItem value="pay_later">Pay Later</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              Interest &amp; Repayment
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Interest Rate (% per annum)"
                  type="number"
                  fullWidth
                  {...register('interest_rate')}
                  error={!!errors.interest_rate}
                  helperText={errors.interest_rate?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField select label="Interest Type" fullWidth {...register('interest_type')}>
                  <MenuItem value="simple">Simple</MenuItem>
                  <MenuItem value="compound">Compound (Reducing Balance)</MenuItem>
                </TextField>
              </Grid>
              <Grid size={4}>
                <TextField
                  label="Tenure"
                  type="number"
                  fullWidth
                  {...register('tenure_value')}
                  error={!!errors.tenure_value}
                  helperText={errors.tenure_value?.message}
                />
              </Grid>
              <Grid size={2}>
                <TextField select label="Unit" fullWidth {...register('tenure_unit')}>
                  <MenuItem value="months">Months</MenuItem>
                  <MenuItem value="years">Years</MenuItem>
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField select label="Repayment Frequency" fullWidth {...register('repayment_frequency')}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="half_yearly">Half-Yearly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField
                  label="First Repayment Date"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('first_repayment_date')}
                  error={!!errors.first_repayment_date}
                  helperText={errors.first_repayment_date?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Maturity Date (calculated)"
                  fullWidth
                  value={maturityPreview ?? ''}
                  disabled
                  helperText="Calculated automatically from loan date + tenure"
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              Tax / TDS (optional)
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField label="Tax Type" fullWidth placeholder="e.g. TDS u/s 194A" {...register('tax_type')} />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Tax Rate (%)"
                  type="number"
                  fullWidth
                  {...register('tax_rate')}
                  error={!!errors.tax_rate}
                  helperText={errors.tax_rate?.message}
                />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <TextField label="Notes / Remarks" fullWidth multiline minRows={2} {...register('notes')} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit(submit)}>
          Save Loan
        </Button>
      </DialogActions>
    </>
  )
}

function EditLoanForm({ loan, onClose }: { loan: LoanDetail; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({ resolver: zodResolver(EDIT_SCHEMA) })

  useEffect(() => {
    reset({
      notes: loan.notes ?? '',
      tax_type: loan.tax_type ?? '',
      tax_rate: loan.tax_rate ? Number(loan.tax_rate) : undefined,
    })
  }, [loan, reset])

  const mutation = useMutation({ mutationFn: (payload: LoanUpdatePayload) => updateLoan(loan.id, payload) })

  const submit = async (values: EditFormValues) => {
    try {
      await mutation.mutateAsync({
        notes: values.notes || null,
        tax_type: values.tax_type || null,
        tax_rate: values.tax_rate ?? null,
      })
      toast('Loan updated')
      await queryClient.invalidateQueries({ queryKey: ['loans'] })
      await queryClient.invalidateQueries({ queryKey: ['loans', loan.id] })
      onClose()
    } catch (error) {
      toast(extractErrorMessage(error), 'error')
    }
  }

  return (
    <>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Stack spacing={2.5}>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Principal, interest, tenure and party details are locked once a loan is created — they drive the
              posted repayment schedule and accounting entries. Only notes and tax details can be edited here.
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField label="Tax Type" fullWidth {...register('tax_type')} />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Tax Rate (%)"
                  type="number"
                  fullWidth
                  {...register('tax_rate')}
                  error={!!errors.tax_rate}
                  helperText={errors.tax_rate?.message}
                />
              </Grid>
              <Grid size={12}>
                <TextField label="Notes / Remarks" fullWidth multiline minRows={2} {...register('notes')} />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit(submit)}>
          Save Changes
        </Button>
      </DialogActions>
    </>
  )
}

export function LoanFormDialog({
  open,
  onClose,
  loan,
}: {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this loan's notes/tax fields instead of creating a new one. */
  loan?: LoanDetail | null
}) {
  const isEdit = !!loan
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 600 }}>{isEdit ? 'Edit Loan' : 'Add Loan'}</DialogTitle>
      {isEdit ? <EditLoanForm loan={loan} onClose={onClose} /> : <CreateLoanForm onClose={onClose} />}
    </Dialog>
  )
}
