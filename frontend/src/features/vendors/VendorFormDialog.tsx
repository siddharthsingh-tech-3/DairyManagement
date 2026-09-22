import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createVendor, updateVendor, type BankAccountInput, type CustomFieldInput } from '@/api/vendors'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import type { VendorDetail } from '@/types/models'

const CATEGORY_SUGGESTIONS = ['Kirana Store', 'Supermarket', 'Retail', 'Wholesale', 'Hotel / Restaurant']

const schema = z.object({
  name: z.string().min(1, 'Required'),
  contact_name: z.string().min(1, 'Required'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  area: z.string().min(1, 'Required'),
  route: z.string().min(1, 'Required'),
  category: z.string().optional(),
  gstin: z.string().optional(),
  pan_number: z.string().optional(),
  opening_balance: z.coerce.number().min(0, 'Must be 0 or more'),
  opening_balance_direction: z.enum(['to_collect', 'to_pay']),
  credit_period_days: z.coerce.number().min(0, 'Must be 0 or more'),
  credit_limit: z.coerce.number().min(0, 'Must be 0 or more'),
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_pincode: z.string().optional(),
  shipping_street: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_pincode: z.string().optional(),
  is_supplier: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const emptyBankAccount: BankAccountInput = { account_holder_name: '', account_number: '', ifsc_code: '', bank_name: '' }
const emptyCustomField: CustomFieldInput = { field_name: '', field_value: '' }

export function VendorFormDialog({
  open,
  onClose,
  vendor,
  defaultIsSupplier = false,
}: {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this vendor instead of creating a new one. */
  vendor?: VendorDetail | null
  /** Pre-selects "Supplier" as the party type — used when opened from the Purchases module. */
  defaultIsSupplier?: boolean
}) {
  const isEdit = !!vendor
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const [sameAsBilling, setSameAsBilling] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccountInput[]>([])
  const [newBankAccount, setNewBankAccount] = useState<BankAccountInput>(emptyBankAccount)
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>([])
  const [newCustomField, setNewCustomField] = useState<CustomFieldInput>(emptyCustomField)

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      opening_balance: 0,
      opening_balance_direction: 'to_collect',
      credit_period_days: 0,
      credit_limit: 0,
      is_supplier: defaultIsSupplier,
    },
  })

  useEffect(() => {
    if (!open) return
    if (vendor) {
      reset({
        name: vendor.name,
        contact_name: vendor.contact_name,
        phone: vendor.phone,
        email: vendor.email ?? '',
        area: vendor.area,
        route: vendor.route,
        category: vendor.category ?? '',
        gstin: vendor.gstin ?? '',
        pan_number: vendor.pan_number ?? '',
        opening_balance: 0,
        opening_balance_direction: 'to_collect',
        credit_period_days: vendor.credit_period_days,
        credit_limit: Number(vendor.credit_limit),
        billing_street: vendor.billing_street ?? '',
        billing_city: vendor.billing_city ?? '',
        billing_state: vendor.billing_state ?? '',
        billing_pincode: vendor.billing_pincode ?? '',
        shipping_street: vendor.shipping_street ?? '',
        shipping_city: vendor.shipping_city ?? '',
        shipping_state: vendor.shipping_state ?? '',
        shipping_pincode: vendor.shipping_pincode ?? '',
        is_supplier: vendor.is_supplier,
      })
    } else {
      reset({
        opening_balance: 0,
        opening_balance_direction: 'to_collect',
        credit_period_days: 0,
        credit_limit: 0,
        is_supplier: defaultIsSupplier,
      })
    }
    setSameAsBilling(false)
    setBankAccounts([])
    setNewBankAccount(emptyBankAccount)
    setCustomFields([])
    setNewCustomField(emptyCustomField)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vendor])

  const resetAll = () => {
    reset()
    setSameAsBilling(false)
    setBankAccounts([])
    setNewBankAccount(emptyBankAccount)
    setCustomFields([])
    setNewCustomField(emptyCustomField)
  }

  const createMutation = useMutation({ mutationFn: createVendor })
  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateVendor>[1]) => updateVendor(vendor!.id, payload),
  })
  const mutation = isEdit ? updateMutation : createMutation

  const submit = async (values: FormValues, keepOpen: boolean) => {
    try {
      const addressFields = {
        email: values.email || null,
        gstin: values.gstin || null,
        pan_number: values.pan_number || null,
        billing_street: values.billing_street || null,
        billing_city: values.billing_city || null,
        billing_state: values.billing_state || null,
        billing_pincode: values.billing_pincode || null,
        shipping_street: sameAsBilling ? values.billing_street || null : values.shipping_street || null,
        shipping_city: sameAsBilling ? values.billing_city || null : values.shipping_city || null,
        shipping_state: sameAsBilling ? values.billing_state || null : values.shipping_state || null,
        shipping_pincode: sameAsBilling ? values.billing_pincode || null : values.shipping_pincode || null,
      }
      if (isEdit) {
        await updateMutation.mutateAsync({ ...values, ...addressFields })
        toast('Party updated')
        await queryClient.invalidateQueries({ queryKey: ['vendors'] })
        onClose()
        return
      }
      await createMutation.mutateAsync({
        ...values,
        ...addressFields,
        bank_accounts: bankAccounts,
        custom_fields: customFields,
      })
      toast(keepOpen ? 'Vendor added — ready for the next one' : 'Vendor added')
      await queryClient.invalidateQueries({ queryKey: ['vendors'] })
      resetAll()
      if (!keepOpen) onClose()
    } catch (error) {
      toast(extractErrorMessage(error), 'error')
    }
  }

  const handleClose = () => {
    resetAll()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 600 }}>{isEdit ? 'Edit Party' : 'Create vendor'}</DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Stack spacing={2.5}>
          {/* --- General Details --- */}
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              General Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField label="Party Name" fullWidth {...register('name')} error={!!errors.name} helperText={errors.name?.message} />
              </Grid>
              <Grid size={6}>
                <TextField label="Mobile Number" fullWidth {...register('phone')} error={!!errors.phone} helperText={errors.phone?.message} />
              </Grid>
              <Grid size={6}>
                <TextField label="Contact person" fullWidth {...register('contact_name')} error={!!errors.contact_name} helperText={errors.contact_name?.message} />
              </Grid>
              <Grid size={6}>
                <TextField label="Email" fullWidth {...register('email')} error={!!errors.email} helperText={errors.email?.message} />
              </Grid>
              <Grid size={6}>
                <TextField label="Area" fullWidth {...register('area')} error={!!errors.area} helperText={errors.area?.message} />
              </Grid>
              <Grid size={6}>
                <TextField label="Delivery route" fullWidth {...register('route')} error={!!errors.route} helperText={errors.route?.message} />
              </Grid>
              {!isEdit && (
                <>
                  <Grid size={8}>
                    <TextField label="Opening Balance (₹)" type="number" fullWidth {...register('opening_balance')} error={!!errors.opening_balance} helperText={errors.opening_balance?.message} />
                  </Grid>
                  <Grid size={4}>
                    <Controller
                      name="opening_balance_direction"
                      control={control}
                      render={({ field }) => (
                        <TextField select label="Direction" fullWidth {...field}>
                          <MenuItem value="to_collect">To Collect</MenuItem>
                          <MenuItem value="to_pay">To Pay</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                </>
              )}
              <Grid size={6}>
                <TextField label="GSTIN (optional)" fullWidth {...register('gstin')} placeholder="15-character GSTIN" />
              </Grid>
              <Grid size={6}>
                <TextField label="PAN Number (optional)" fullWidth {...register('pan_number')} placeholder="10-character PAN" />
              </Grid>
              <Grid size={6}>
                <Controller
                  name="is_supplier"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Party Type"
                      fullWidth
                      value={field.value ? 'supplier' : 'customer'}
                      onChange={(e) => field.onChange(e.target.value === 'supplier')}
                    >
                      <MenuItem value="customer">Customer</MenuItem>
                      <MenuItem value="supplier">Supplier</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      freeSolo
                      options={CATEGORY_SUGGESTIONS}
                      value={field.value ?? ''}
                      onInputChange={(_, value) => field.onChange(value)}
                      renderInput={(params) => <TextField {...params} label="Party Category (optional)" />}
                    />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Credit Period (days)"
                  type="number"
                  fullWidth
                  {...register('credit_period_days')}
                  error={!!errors.credit_period_days}
                  helperText={errors.credit_period_days?.message}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Credit Limit (₹)"
                  type="number"
                  fullWidth
                  {...register('credit_limit')}
                  error={!!errors.credit_limit}
                  helperText={errors.credit_limit?.message}
                />
              </Grid>
            </Grid>
          </Box>

          {/* --- Address --- */}
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 2 }}>
              Address
            </Typography>
            <Typography variant="caption" fontWeight={500} color="primary.main" sx={{ display: 'block', mb: 1 }}>
              BILLING ADDRESS
            </Typography>
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid size={6}>
                <TextField label="Street Address" fullWidth {...register('billing_street')} />
              </Grid>
              <Grid size={6}>
                <TextField label="City" fullWidth {...register('billing_city')} />
              </Grid>
              <Grid size={6}>
                <TextField label="State" fullWidth {...register('billing_state')} />
              </Grid>
              <Grid size={6}>
                <TextField label="Pincode" fullWidth {...register('billing_pincode')} />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Checkbox
                  checked={sameAsBilling}
                  onChange={(e) => {
                    setSameAsBilling(e.target.checked)
                    if (e.target.checked) {
                      const v = getValues()
                      setValue('shipping_street', v.billing_street)
                      setValue('shipping_city', v.billing_city)
                      setValue('shipping_state', v.billing_state)
                      setValue('shipping_pincode', v.billing_pincode)
                    }
                  }}
                />
              }
              label="Same as Billing address"
            />

            {!sameAsBilling && (
              <>
                <Typography variant="caption" fontWeight={500} color="primary.main" sx={{ display: 'block', mb: 1, mt: 1 }}>
                  SHIPPING ADDRESS
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField label="Street Address" fullWidth {...register('shipping_street')} />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="City" fullWidth {...register('shipping_city')} />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="State" fullWidth {...register('shipping_state')} />
                  </Grid>
                  <Grid size={6}>
                    <TextField label="Pincode" fullWidth {...register('shipping_pincode')} />
                  </Grid>
                </Grid>
              </>
            )}
          </Box>

          {/* --- Bank Accounts & Custom Fields (create-time only; managed from the Profile tab once the party exists) --- */}
          {!isEdit && (
          <>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 1.5 }}>
              Party Bank Account
            </Typography>
            {bankAccounts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                No bank accounts added yet.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mb: 1.5 }} divider={<Divider />}>
                {bankAccounts.map((acc, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {acc.account_holder_name} · {acc.bank_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        A/C {acc.account_number} · {acc.ifsc_code.toUpperCase()}
                      </Typography>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => setBankAccounts((prev) => prev.filter((_, idx) => idx !== i))}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={3}>
                <TextField
                  size="small"
                  label="Account holder"
                  fullWidth
                  value={newBankAccount.account_holder_name}
                  onChange={(e) => setNewBankAccount((p) => ({ ...p, account_holder_name: e.target.value }))}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  size="small"
                  label="Bank name"
                  fullWidth
                  value={newBankAccount.bank_name}
                  onChange={(e) => setNewBankAccount((p) => ({ ...p, bank_name: e.target.value }))}
                />
              </Grid>
              <Grid size={2.5}>
                <TextField
                  size="small"
                  label="Account no."
                  fullWidth
                  value={newBankAccount.account_number}
                  onChange={(e) => setNewBankAccount((p) => ({ ...p, account_number: e.target.value }))}
                />
              </Grid>
              <Grid size={2}>
                <TextField
                  size="small"
                  label="IFSC"
                  fullWidth
                  value={newBankAccount.ifsc_code}
                  onChange={(e) => setNewBankAccount((p) => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))}
                />
              </Grid>
              <Grid size={1.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<span>+</span>}
                  disabled={
                    !newBankAccount.account_holder_name ||
                    !newBankAccount.bank_name ||
                    newBankAccount.account_number.length < 4 ||
                    newBankAccount.ifsc_code.length !== 11
                  }
                  onClick={() => {
                    setBankAccounts((prev) => [...prev, newBankAccount])
                    setNewBankAccount(emptyBankAccount)
                  }}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* --- Custom Fields --- */}
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
            <Typography fontWeight={600} sx={{ mb: 1.5 }}>
              Custom Field
            </Typography>
            {customFields.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                No custom fields added yet.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mb: 1.5 }} divider={<Divider />}>
                {customFields.map((f, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.5 }}>
                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                      {f.field_name}: <Typography component="span" fontWeight={400}>{f.field_value}</Typography>
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => setCustomFields((prev) => prev.filter((_, idx) => idx !== i))}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
            <Stack direction="row" spacing={1.5}>
              <TextField
                size="small"
                label="Field name"
                fullWidth
                value={newCustomField.field_name}
                onChange={(e) => setNewCustomField((p) => ({ ...p, field_name: e.target.value }))}
              />
              <TextField
                size="small"
                label="Value"
                fullWidth
                value={newCustomField.field_value}
                onChange={(e) => setNewCustomField((p) => ({ ...p, field_value: e.target.value }))}
              />
              <Button
                variant="outlined"
                sx={{ whiteSpace: 'nowrap' }}
                disabled={!newCustomField.field_name || !newCustomField.field_value}
                onClick={() => {
                  setCustomFields((prev) => [...prev, newCustomField])
                  setNewCustomField(emptyCustomField)
                }}
              >
                + Add New Field
              </Button>
            </Stack>
          </Box>
          </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        {!isEdit && (
          <Button variant="outlined" disabled={mutation.isPending} onClick={handleSubmit((v) => submit(v, true))}>
            Save & New
          </Button>
        )}
        <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit((v) => submit(v, false))}>
          {isEdit ? 'Save Changes' : 'Save Party'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
