import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Box,
  Breadcrumbs,
  Button,
  Grid2 as Grid,
  Link,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { createOrder } from '@/api/orders'
import { listVendors } from '@/api/vendors'
import { listProducts } from '@/api/products'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const itemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  quantity: z.coerce.number().min(0),
  crates_qty: z.coerce.number().min(0),
})

const schema = z
  .object({
    source: z.enum(['vendor', 'customer']),
    vendor_id: z.string().optional(),
    customer_name: z.string().optional(),
    order_type: z.enum(['scheduled', 'recurring']),
    delivery_date: z.string().optional(),
    recurrence_frequency: z.string().optional(),
    items: z.array(itemSchema),
    payment_method: z.enum(['upi', 'cod', 'pay_later']),
  })
  .refine((data) => data.items.some((i) => i.quantity > 0), {
    message: 'Enter a quantity for at least one product',
    path: ['items'],
  })

type FormValues = z.infer<typeof schema>

export function ScheduleOrderPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isVendorUser = user?.role === 'vendor'
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors(undefined, false), enabled: !isVendorUser })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: 'vendor',
      order_type: 'scheduled',
      delivery_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      recurrence_frequency: 'Daily',
      items: [],
      payment_method: 'pay_later',
    },
  })

  const { fields, replace } = useFieldArray({ control, name: 'items' })

  const source = watch('source')
  const orderType = watch('order_type')

  useEffect(() => {
    if (products.length === 0) return
    replace(products.map((p) => ({ product_id: p.id, product_name: p.name, quantity: 0, crates_qty: 0 })))
  }, [products, replace])

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async () => {
      toast('Order created')
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      vendor_id: isVendorUser ? user!.vendor_id : source === 'vendor' ? values.vendor_id : null,
      walkin_customer_name: source === 'customer' ? values.customer_name : null,
      order_type: orderType,
      recurrence_frequency: orderType === 'recurring' ? values.recurrence_frequency : null,
      delivery_date: orderType === 'scheduled' ? values.delivery_date : null,
      payment_method: values.payment_method,
      items: values.items
        .filter((i) => i.quantity > 0)
        .map((i) => ({ product_id: i.product_id, quantity: i.quantity, crates_qty: i.crates_qty })),
    })
  }

  return (
    <Stack spacing={2.5}>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
        <Link component="button" variant="body2" underline="hover" color="inherit" onClick={() => navigate('/orders')}>
          {isVendorUser ? 'My Orders' : 'Demand Scheduling'}
        </Link>
        <Typography variant="body2" color="text.primary" fontWeight={500}>
          Schedule an order
        </Typography>
      </Breadcrumbs>

      <Box>
        <Typography variant="h5" fontWeight={600}>
          Schedule an order
        </Typography>
        <Typography color="text.secondary">Create a scheduled or recurring order for a vendor or walk-in customer</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {!isVendorUser && (
            <Grid size={12}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={source}
                onChange={(_, v) => v && setValue('source', v)}
              >
                <ToggleButton value="vendor">Vendor</ToggleButton>
                <ToggleButton value="customer">Walk-in customer</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          )}
          {!isVendorUser && source === 'vendor' && (
            <Grid size={12}>
              <Controller
                name="vendor_id"
                control={control}
                render={({ field }) => (
                  <TextField select label="Vendor" fullWidth {...field}>
                    {vendors.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
          )}
          {!isVendorUser && source === 'customer' && (
            <Grid size={12}>
              <TextField label="Customer name" fullWidth {...register('customer_name')} placeholder="e.g. Deshpande, Flat 4B" />
            </Grid>
          )}
          <Grid size={12}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={orderType}
              onChange={(_, v) => v && setValue('order_type', v)}
            >
              <ToggleButton value="scheduled">Scheduled</ToggleButton>
              <ToggleButton value="recurring">Recurring</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          {orderType === 'scheduled' ? (
            <Grid size={12}>
              <TextField type="date" label="Delivery date" fullWidth InputLabelProps={{ shrink: true }} {...register('delivery_date')} />
            </Grid>
          ) : (
            <Grid size={12}>
              <Controller
                name="recurrence_frequency"
                control={control}
                render={({ field }) => (
                  <TextField select label="Frequency" fullWidth {...field}>
                    <MenuItem value="Daily">Daily</MenuItem>
                    <MenuItem value="Every Monday">Every Monday</MenuItem>
                    <MenuItem value="Weekends only">Weekends only</MenuItem>
                    <MenuItem value="Festival special">Festival special</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
          )}
          <Grid size={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Products
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {fields.map((field, index) => (
                <Grid container spacing={1.5} key={field.id} alignItems="center">
                  <Grid size={6}>
                    <Typography variant="body2">{field.product_name}</Typography>
                  </Grid>
                  <Grid size={3}>
                    <TextField
                      label="Qty (pkt)"
                      type="number"
                      size="small"
                      fullWidth
                      {...register(`items.${index}.quantity`)}
                    />
                  </Grid>
                  <Grid size={3}>
                    <TextField label="Crates" type="number" size="small" fullWidth {...register(`items.${index}.crates_qty`)} />
                  </Grid>
                </Grid>
              ))}
            </Box>
            {errors.items?.message && (
              <Typography variant="caption" color="error">
                {errors.items.message}
              </Typography>
            )}
          </Grid>
          <Grid size={12}>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <TextField select label="Payment" fullWidth {...field}>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="cod">Cash on delivery</MenuItem>
                  <MenuItem value="pay_later">Pay later</MenuItem>
                </TextField>
              )}
            />
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
          <Button onClick={() => navigate('/orders')} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" disabled={mutation.isPending} onClick={handleSubmit(onSubmit)}>
            Confirm order
          </Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
