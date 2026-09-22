import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid2 as Grid, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBusinessPartner, updateBusinessPartner } from '@/api/businessPartners'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { BusinessPartnerDetail } from '@/types/models'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  address: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  tin: z.string().optional(),
  pan_number: z
    .string()
    .optional()
    .refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), 'Enter a valid 10-character PAN'),
  gstin: z
    .string()
    .optional()
    .refine((v) => !v || v.length === 15, 'GSTIN must be 15 characters'),
  other_tax_details: z.string().optional(),
  opening_capital_balance: z.coerce.number().min(0, 'Must be 0 or more'),
  opening_balance_date: z.string().optional(),
  account_number: z.string().optional(),
  account_holder_name: z.string().optional(),
  bank_name: z.string().optional(),
  ifsc_code: z
    .string()
    .optional()
    .refine((v) => !v || v.length === 11, 'IFSC code must be 11 characters'),
  branch_name: z.string().optional(),
})

/** Bank details are captured on the partner profile itself, so the account number is
 *  mandatory when adding a partner. Existing partners manage accounts from the Bank
 *  Details tab instead, so the field is not re-validated on edit. */
const createSchema = schema.refine((v) => !!v.account_number && v.account_number.length >= 4, {
  path: ['account_number'],
  message: 'Enter the bank account number (at least 4 characters)',
})

type FormValues = z.infer<typeof schema>

export function PartnerFormDialog({
  open,
  onClose,
  partner,
}: {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this partner instead of creating a new one. */
  partner?: BusinessPartnerDetail | null
}) {
  const isEdit = !!partner
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? schema : createSchema),
    defaultValues: { opening_capital_balance: 0 },
  })

  useEffect(() => {
    if (!open) return
    if (partner) {
      reset({
        name: partner.name,
        address: partner.address,
        phone: partner.phone ?? '',
        email: partner.email ?? '',
        tin: partner.tin ?? '',
        pan_number: partner.pan_number ?? '',
        gstin: partner.gstin ?? '',
        other_tax_details: partner.other_tax_details ?? '',
        opening_capital_balance: Number(partner.opening_capital_balance),
        opening_balance_date: partner.opening_balance_date ?? '',
      })
    } else {
      reset({ opening_capital_balance: 0 })
    }
  }, [open, partner, reset])

  const createMutation = useMutation({ mutationFn: createBusinessPartner })
  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateBusinessPartner>[1]) => updateBusinessPartner(partner!.id, payload),
  })
  const mutation = isEdit ? updateMutation : createMutation

  const submit = async (values: FormValues) => {
    try {
      const payload = {
        name: values.name,
        address: values.address,
        phone: values.phone || null,
        email: values.email || null,
        tin: values.tin || null,
        pan_number: values.pan_number || null,
        gstin: values.gstin || null,
        other_tax_details: values.other_tax_details || null,
        opening_capital_balance: values.opening_capital_balance,
        opening_balance_date: values.opening_balance_date || null,
      }
      if (isEdit) {
        await updateMutation.mutateAsync(payload)
        toast('Partner updated')
        await queryClient.invalidateQueries({ queryKey: ['business-partners', partner!.id] })
      } else {
        await createMutation.mutateAsync({
          ...payload,
          bank_accounts: [
            {
              account_number: values.account_number!.trim(),
              account_holder_name: values.account_holder_name?.trim() || null,
              bank_name: values.bank_name?.trim() || null,
              ifsc_code: values.ifsc_code?.trim().toUpperCase() || null,
              branch_name: values.branch_name?.trim() || null,
              is_primary: true,
            },
          ],
        })
        toast('Partner added')
      }
      await queryClient.invalidateQueries({ queryKey: ['business-partners'] })
      onClose()
    } catch (error) {
      toast(extractErrorMessage(error), 'error')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 600 }}>{isEdit ? 'Edit Partner' : 'Add Business Partner'}</DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Stack spacing={2.5}>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              Basic Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField label="Partner Name" fullWidth {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Address"
                  fullWidth
                  multiline
                  minRows={2}
                  {...register('address')}
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField label="Phone" fullWidth {...register('phone')} />
              </Grid>
              <Grid size={6}>
                <TextField label="Email" fullWidth {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              Tax Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField label="Tax Identification Number (TIN)" fullWidth {...register('tin')} />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="PAN Number"
                  fullWidth
                  {...register('pan_number')}
                  error={!!errors.pan_number}
                  helperText={errors.pan_number?.message}
                  placeholder="10-character PAN"
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="GSTIN"
                  fullWidth
                  {...register('gstin')}
                  error={!!errors.gstin}
                  helperText={errors.gstin?.message}
                  placeholder="15-character GSTIN"
                />
              </Grid>
              <Grid size={6}>
                <TextField label="Other Tax Details" fullWidth {...register('other_tax_details')} />
              </Grid>
            </Grid>
          </Box>

          {!isEdit && (
            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
              <Typography fontWeight={600}>Bank Details</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Used for partner payouts. Further accounts can be added from the partner's Bank Details tab.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label="Bank Account Number *"
                    fullWidth
                    {...register('account_number')}
                    error={!!errors.account_number}
                    helperText={errors.account_number?.message}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField label="Account Holder Name" fullWidth {...register('account_holder_name')} />
                </Grid>
                <Grid size={6}>
                  <TextField label="Bank Name" fullWidth {...register('bank_name')} />
                </Grid>
                <Grid size={6}>
                  <TextField
                    label="IFSC Code"
                    fullWidth
                    {...register('ifsc_code')}
                    error={!!errors.ifsc_code}
                    helperText={errors.ifsc_code?.message}
                    placeholder="11-character IFSC"
                  />
                </Grid>
                <Grid size={6}>
                  <TextField label="Branch Name" fullWidth {...register('branch_name')} />
                </Grid>
              </Grid>
            </Box>
          )}

          {!isEdit && (
            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
              <Typography fontWeight={600} sx={{ mb: 2 }}>
                Opening Capital Balance
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label="Opening Capital Balance (₹)"
                    type="number"
                    fullWidth
                    {...register('opening_capital_balance')}
                    error={!!errors.opening_capital_balance}
                    helperText={errors.opening_capital_balance?.message}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField label="As of Date" type="date" fullWidth slotProps={{ inputLabel: { shrink: true } }} {...register('opening_balance_date')} />
                </Grid>
              </Grid>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit(submit)}>
          {isEdit ? 'Save Changes' : 'Save Partner'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
