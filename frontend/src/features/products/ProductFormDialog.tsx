import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  InputAdornment,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AddIcon from '@mui/icons-material/Add'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createProduct, updateProduct } from '@/api/products'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { CategorySelect } from '@/components/CategorySelect'
import { GST_RATE_OPTIONS, MEASURING_UNITS } from '@/constants/productOptions'
import type { Product } from '@/types/models'

const schema = z.object({
  item_type: z.enum(['product', 'service']),
  sku: z.string().optional(),
  name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  show_in_online_store: z.boolean(),
  hsn_code: z.string().optional(),
  rate: z.coerce.number().positive('Must be greater than 0'),
  sales_price_includes_tax: z.boolean(),
  purchase_price: z.literal('').or(z.coerce.number().min(0)),
  purchase_price_includes_tax: z.boolean(),
  gst_percent: z.coerce.number().min(0).max(100),
  discount_percent: z.literal('').or(z.coerce.number().min(0).max(100)),
  unit: z.string().optional(),
  alternative_unit: z.string().optional(),
  current_stock: z.coerce.number().min(0),
  opening_stock_date: z.string().optional(),
  low_stock_alert_enabled: z.boolean(),
  reorder_level: z.coerce.number().min(0),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const emptyDefaults: FormValues = {
  item_type: 'product',
  sku: '',
  name: '',
  category: '',
  show_in_online_store: false,
  hsn_code: '',
  rate: 0,
  sales_price_includes_tax: true,
  purchase_price: '',
  purchase_price_includes_tax: true,
  gst_percent: 0,
  discount_percent: '',
  unit: '',
  alternative_unit: '',
  current_stock: 0,
  opening_stock_date: '',
  low_stock_alert_enabled: false,
  reorder_level: 0,
  description: '',
}

type SectionKey = 'basic' | 'stock' | 'pricing' | 'party' | 'custom'

const NAV_ITEMS: { key: SectionKey; label: string; icon: React.ReactNode; required?: boolean }[] = [
  { key: 'basic', label: 'Basic Details', icon: <AssignmentOutlinedIcon fontSize="small" />, required: true },
  { key: 'stock', label: 'Stock Details', icon: <Inventory2OutlinedIcon fontSize="small" /> },
  { key: 'pricing', label: 'Pricing Details', icon: <SellOutlinedIcon fontSize="small" /> },
  { key: 'party', label: 'Party Wise Prices', icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  { key: 'custom', label: 'Custom Fields', icon: <ViewListOutlinedIcon fontSize="small" /> },
]

function generateBarcode() {
  return `ITM${Date.now().toString().slice(-9)}`
}

/** Compact With/Without Tax select rendered as a TextField end-adornment. */
function TaxModeAdornment({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Select
      variant="standard"
      disableUnderline
      value={value ? 'with' : 'without'}
      onChange={(e) => onChange(e.target.value === 'with')}
      sx={{ fontSize: 13, fontWeight: 500, color: 'primary.main', ml: 1 }}
    >
      <MenuItem value="with">With Tax</MenuItem>
      <MenuItem value="without">Without Tax</MenuItem>
    </Select>
  )
}

function GstRateSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <TextField select label="GST Tax Rate(%)" fullWidth size="small" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {GST_RATE_OPTIONS.map((o, i) => (
        <MenuItem key={`${o.label}-${i}`} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  )
}

export function ProductFormDialog({
  open,
  onClose,
  product,
}: {
  open: boolean
  onClose: () => void
  /** When set, the dialog edits this product instead of creating a new one. */
  product?: Product | null
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const isEdit = !!product
  const [section, setSection] = useState<SectionKey>('basic')
  const [showAltUnit, setShowAltUnit] = useState(false)
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyDefaults })

  const itemType = watch('item_type')
  const lowStockEnabled = watch('low_stock_alert_enabled')
  const isService = itemType === 'service'

  useEffect(() => {
    if (!open) return
    setSection('basic')
    if (product) {
      setShowAltUnit(!!product.alternative_unit)
      reset({
        item_type: product.item_type,
        sku: product.sku,
        name: product.name,
        category: product.category ?? '',
        show_in_online_store: product.show_in_online_store,
        hsn_code: product.hsn_code,
        rate: Number(product.rate),
        sales_price_includes_tax: product.sales_price_includes_tax,
        purchase_price: product.purchase_price ? Number(product.purchase_price) : '',
        purchase_price_includes_tax: product.purchase_price_includes_tax,
        gst_percent: Number(product.gst_percent),
        discount_percent: product.discount_percent ? Number(product.discount_percent) : '',
        unit: product.unit ?? '',
        alternative_unit: product.alternative_unit ?? '',
        current_stock: product.current_stock,
        opening_stock_date: product.opening_stock_date ?? '',
        low_stock_alert_enabled: product.low_stock_alert_enabled,
        reorder_level: product.reorder_level,
        description: product.description ?? '',
      })
    } else {
      setShowAltUnit(false)
      reset(emptyDefaults)
    }
  }, [open, product, reset])

  const buildPayload = (v: FormValues) => ({
    sku: v.sku?.trim() || generateBarcode(),
    name: v.name,
    item_type: v.item_type,
    category: v.category || null,
    hsn_code: v.hsn_code || '',
    rate: v.rate,
    purchase_price: v.purchase_price === '' || v.purchase_price == null ? null : Number(v.purchase_price),
    sales_price_includes_tax: v.sales_price_includes_tax,
    purchase_price_includes_tax: v.purchase_price_includes_tax,
    gst_percent: v.gst_percent,
    discount_percent: v.discount_percent === '' || v.discount_percent == null ? null : Number(v.discount_percent),
    unit: v.unit || 'PCS',
    alternative_unit: v.alternative_unit || null,
    reorder_level: v.reorder_level,
    low_stock_alert_enabled: v.low_stock_alert_enabled,
    current_stock: isService ? 0 : v.current_stock,
    opening_stock_date: v.opening_stock_date || null,
    show_in_online_store: v.show_in_online_store,
    description: v.description || null,
  })

  const mutation = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = buildPayload(v)
      if (isEdit && product) return updateProduct(product.id, payload)
      return createProduct(payload)
    },
    onSuccess: async () => {
      toast(isEdit ? 'Item updated' : 'Item added')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const saveAndClose = handleSubmit(async (v) => {
    await mutation.mutateAsync(v)
    onClose()
  })

  const saveAndNew = handleSubmit(async (v) => {
    await mutation.mutateAsync(v)
    setShowAltUnit(false)
    reset(emptyDefaults)
    setSection('basic')
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { height: '85vh' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600 }}>
        {isEdit ? 'Edit Item' : 'Create New Item'}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', gap: 0, p: 0, overflow: 'hidden' }}>
        <Box sx={{ width: 230, borderRight: 1, borderColor: 'divider', p: 2, flexShrink: 0, overflowY: 'auto' }}>
          <ListItemButton
            selected={section === 'basic'}
            onClick={() => setSection('basic')}
            sx={{ borderRadius: 2, mb: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>{NAV_ITEMS[0].icon}</ListItemIcon>
            <ListItemText
              primary={
                <>
                  Basic Details <Typography component="span" color="error.main">*</Typography>
                </>
              }
            />
          </ListItemButton>
          <Typography variant="caption" sx={{ pl: 1, color: 'text.secondary', fontWeight: 500 }}>
            Advance Details
          </Typography>
          {NAV_ITEMS.slice(1).map((item) => (
            <ListItemButton
              key={item.key}
              selected={section === item.key}
              onClick={() => setSection(item.key)}
              sx={{ borderRadius: 2, mt: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </Box>

        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {section === 'basic' && (
            <Grid container spacing={2.5}>
              <Grid size={6}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Item Type <Typography component="span" color="error.main">*</Typography>
                </Typography>
                <Controller
                  control={control}
                  name="item_type"
                  render={({ field }) => (
                    <Stack direction="row" spacing={1.5}>
                      {(['product', 'service'] as const).map((opt) => (
                        <Box
                          key={opt}
                          onClick={() => field.onChange(opt)}
                          sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: 1,
                            borderColor: field.value === opt ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            px: 1.5,
                            py: 1,
                            cursor: 'pointer',
                          }}
                        >
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {opt}
                          </Typography>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              border: 2,
                              borderColor: field.value === opt ? 'primary.main' : 'text.disabled',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {field.value === opt && (
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <CategorySelect value={field.value || null} onChange={(name) => field.onChange(name ?? '')} />
                  )}
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Item Name"
                  required
                  fullWidth
                  size="small"
                  placeholder="ex: Maggie 20gm"
                  {...register('name')}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid size={6}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
                  <Typography variant="body2">Show Item in Online Store</Typography>
                  <Controller
                    control={control}
                    name="show_in_online_store"
                    render={({ field }) => <Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  />
                </Stack>
              </Grid>

              <Grid size={6}>
                <Controller
                  control={control}
                  name="sales_price_includes_tax"
                  render={({ field: taxField }) => (
                    <TextField
                      label="Sales Price"
                      type="number"
                      fullWidth
                      size="small"
                      placeholder="ex: ₹200"
                      {...register('rate')}
                      error={!!errors.rate}
                      helperText={errors.rate?.message}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          endAdornment: <TaxModeAdornment value={taxField.value} onChange={taxField.onChange} />,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller
                  control={control}
                  name="gst_percent"
                  render={({ field }) => <GstRateSelect value={field.value} onChange={field.onChange} />}
                />
              </Grid>

              <Grid size={6}>
                <Controller
                  control={control}
                  name="unit"
                  render={({ field }) => (
                    <Autocomplete
                      freeSolo
                      options={MEASURING_UNITS}
                      value={field.value || ''}
                      onInputChange={(_, v) => field.onChange(v)}
                      renderInput={(params) => <TextField {...params} label="Measuring Unit" size="small" fullWidth />}
                    />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Opening Stock"
                  type="number"
                  fullWidth
                  size="small"
                  placeholder="ex: 150 PCS"
                  disabled={isService}
                  {...register('current_stock')}
                />
              </Grid>
            </Grid>
          )}

          {section === 'stock' && (
            <Grid container spacing={2.5}>
              <Grid size={6}>
                <Controller
                  control={control}
                  name="sku"
                  render={({ field }) => (
                    <TextField
                      label="Item Code"
                      fullWidth
                      size="small"
                      placeholder="ex: ITM12549"
                      value={field.value}
                      onChange={field.onChange}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <Button size="small" onClick={() => field.onChange(generateBarcode())}>
                                Generate Barcode
                              </Button>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="HSN code"
                  fullWidth
                  size="small"
                  placeholder="ex: 4010"
                  {...register('hsn_code')}
                  helperText={
                    <Typography
                      component="span"
                      variant="caption"
                      color="primary.main"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => toast('HSN code lookup is not available yet', 'info')}
                    >
                      Find HSN Code
                    </Typography>
                  }
                />
              </Grid>

              <Grid size={6}>
                <Controller
                  control={control}
                  name="unit"
                  render={({ field }) => (
                    <Autocomplete
                      freeSolo
                      options={MEASURING_UNITS}
                      value={field.value || ''}
                      onInputChange={(_, v) => field.onChange(v)}
                      renderInput={(params) => <TextField {...params} label="Measuring Unit" size="small" fullWidth />}
                    />
                  )}
                />
                {!showAltUnit ? (
                  <Typography
                    variant="caption"
                    color="primary.main"
                    sx={{ display: 'inline-block', mt: 1, cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => setShowAltUnit(true)}
                  >
                    + Alternative Unit
                  </Typography>
                ) : (
                  <TextField
                    label="Alternative Unit"
                    fullWidth
                    size="small"
                    sx={{ mt: 2 }}
                    {...register('alternative_unit')}
                  />
                )}
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Opening Stock"
                  type="number"
                  fullWidth
                  size="small"
                  placeholder="ex: 150 PCS"
                  disabled={isService}
                  {...register('current_stock')}
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="As of Date"
                  type="date"
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('opening_stock_date')}
                />
              </Grid>
              <Grid size={6} sx={{ display: 'flex', alignItems: 'center' }}>
                {!lowStockEnabled ? (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography
                      variant="body2"
                      color="primary.main"
                      sx={{ cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => setValue('low_stock_alert_enabled', true)}
                    >
                      + Enable Low stock quantity warning
                    </Typography>
                    <Tooltip title="Get notified when the stock quantity falls below this level">
                      <InfoOutlinedIcon fontSize="inherit" sx={{ color: 'text.secondary' }} />
                    </Tooltip>
                  </Stack>
                ) : (
                  <TextField
                    label="Low Stock Quantity"
                    type="number"
                    fullWidth
                    size="small"
                    {...register('reorder_level')}
                  />
                )}
              </Grid>

              <Grid size={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Enter Description"
                  {...register('description')}
                />
              </Grid>
            </Grid>
          )}

          {section === 'pricing' && (
            <Grid container spacing={2.5}>
              <Grid size={6}>
                <Controller
                  control={control}
                  name="sales_price_includes_tax"
                  render={({ field: taxField }) => (
                    <TextField
                      label="Sales Price"
                      type="number"
                      fullWidth
                      size="small"
                      placeholder="ex: ₹200"
                      {...register('rate')}
                      error={!!errors.rate}
                      helperText={errors.rate?.message}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          endAdornment: <TaxModeAdornment value={taxField.value} onChange={taxField.onChange} />,
                        },
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid size={6}>
                <Controller
                  control={control}
                  name="purchase_price_includes_tax"
                  render={({ field: taxField }) => (
                    <TextField
                      label="Purchase Price"
                      type="number"
                      fullWidth
                      size="small"
                      placeholder="ex: ₹200"
                      {...register('purchase_price')}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                          endAdornment: <TaxModeAdornment value={taxField.value} onChange={taxField.onChange} />,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid size={6}>
                <Controller
                  control={control}
                  name="gst_percent"
                  render={({ field }) => <GstRateSelect value={field.value} onChange={field.onChange} />}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Discount on Sales Price"
                  type="number"
                  fullWidth
                  size="small"
                  placeholder="ex: 12"
                  {...register('discount_percent')}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="body2">%</Typography>
                            <Tooltip title="Discount applied automatically on the sales price">
                              <InfoOutlinedIcon fontSize="inherit" sx={{ color: 'text.secondary' }} />
                            </Tooltip>
                          </Stack>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
            </Grid>
          )}

          {section === 'party' && (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', bgcolor: 'action.hover', borderRadius: 3, p: 4, maxWidth: 380 }}>
                <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {isEdit
                    ? 'Party Wise Prices are not available yet.'
                    : 'To enable Party Wise Prices and set custom prices for parties, please save the item first'}
                </Typography>
              </Box>
            </Box>
          )}

          {section === 'custom' && (
            <Box>
              <Box sx={{ bgcolor: 'warning.light', color: 'warning.dark', borderRadius: 2, p: 1.5, mb: 2 }}>
                <Typography variant="body2">
                  <InfoOutlinedIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  Custom fields aren't available yet.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" variant="outlined">
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {!isEdit && (
          <Button variant="outlined" disabled={mutation.isPending} onClick={saveAndNew} startIcon={<AddIcon />}>
            Save & New
          </Button>
        )}
        <Button variant="contained" disabled={mutation.isPending} onClick={saveAndClose}>
          {isEdit ? 'Save Changes' : 'Save Item'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
