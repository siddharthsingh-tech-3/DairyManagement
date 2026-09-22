import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Grid2 as Grid, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import dayjs from 'dayjs'
import { listProducts, updateProduct } from '@/api/products'
import { LoadingScreen } from '@/components/LoadingScreen'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrency } from '@/utils/format'

const TAB_LABELS = ['Item Details', 'Party Wise Prices'] as const

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography fontWeight={500}>{value}</Typography>
    </Box>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography fontWeight={600}>{title}</Typography>
      </Box>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Box>
  )
}

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { can } = usePermission('products')
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const product = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId])

  const deactivate = useMutation({
    mutationFn: () => updateProduct(productId!, { is_active: false }),
    onSuccess: async () => {
      toast('Item deleted')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/products')
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  if (isLoading || !product) return <LoadingScreen />

  return (
    <Stack spacing={0} sx={{ mx: -3.5, mt: -3.5 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1.5}
        sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/products')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography fontWeight={600} fontSize={17}>
              {product.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {product.category || 'Product'}
            </Typography>
          </Box>
        </Stack>
        {can('full') && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<EditIcon fontSize="small" />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon fontSize="small" />} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </Stack>
        )}
      </Stack>

      <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {TAB_LABELS.map((label) => (
            <Tab key={label} label={label} sx={{ fontWeight: 500 }} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                <SectionCard title="General Details">
                  <Grid container spacing={2.5}>
                    <Grid size={12}>
                      <InfoRow label="Item Name" value={product.name} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Item Code" value={product.sku || '—'} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Category" value={product.category || '—'} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Unit" value={product.unit || '—'} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Low Stock Quantity" value={product.low_stock_alert_enabled ? product.reorder_level : '—'} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow
                        label="Show in Online Store"
                        value={
                          <Typography component="span" fontWeight={500} color={product.show_in_online_store ? 'success.main' : 'error.main'}>
                            {product.show_in_online_store ? 'Yes' : 'No'}
                          </Typography>
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow
                        label="Status"
                        value={
                          <Typography component="span" fontWeight={500} color={product.is_active ? 'success.main' : 'text.secondary'}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Typography>
                        }
                      />
                    </Grid>
                    <Grid size={12}>
                      <InfoRow label="Description" value={product.description || '—'} />
                    </Grid>
                  </Grid>
                </SectionCard>

                <SectionCard title="Stock & Batch">
                  <Grid container spacing={2.5}>
                    <Grid size={6}>
                      <InfoRow label="Current Stock" value={`${product.current_stock} ${product.unit}`} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Reorder Level" value={product.reorder_level} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Batch No." value={product.batch_no || '—'} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow
                        label="Expiry Date"
                        value={product.expiry_date ? dayjs(product.expiry_date).format('D MMM YYYY') : '—'}
                      />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow
                        label="Opening Stock Date"
                        value={product.opening_stock_date ? dayjs(product.opening_stock_date).format('D MMM YYYY') : '—'}
                      />
                    </Grid>
                  </Grid>
                </SectionCard>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                <SectionCard title="Pricing Details">
                  <Grid container spacing={2.5}>
                    <Grid size={6}>
                      <InfoRow
                        label="Sales Price"
                        value={
                          <>
                            {formatCurrency(product.rate)}{' '}
                            <Typography component="span" variant="caption" color="text.secondary" fontWeight={400}>
                              {product.sales_price_includes_tax ? 'With Tax' : 'Without Tax'}
                            </Typography>
                          </>
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow
                        label="Purchase Price"
                        value={
                          product.purchase_price ? (
                            <>
                              {formatCurrency(product.purchase_price)}{' '}
                              <Typography component="span" variant="caption" color="text.secondary" fontWeight={400}>
                                {product.purchase_price_includes_tax ? 'With Tax' : 'Without Tax'}
                              </Typography>
                            </>
                          ) : (
                            '—'
                          )
                        }
                      />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="GST Tax Rate" value={`${product.gst_percent}%`} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Discount on Sales Price" value={product.discount_percent ? `${product.discount_percent}%` : '—'} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="HSN / SAC Code" value={product.hsn_code || '—'} />
                    </Grid>
                    <Grid size={6}>
                      <InfoRow label="Secondary Unit" value={product.alternative_unit || '—'} />
                    </Grid>
                  </Grid>
                </SectionCard>

                <SectionCard title="Custom Fields">
                  <Box sx={{ bgcolor: 'warning.light', color: 'warning.dark', borderRadius: 2, p: 1.5 }}>
                    <Typography variant="body2">
                      <InfoOutlinedIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                      Custom fields aren&apos;t available yet.
                    </Typography>
                  </Box>
                </SectionCard>
              </Stack>
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
            <Box sx={{ textAlign: 'center', bgcolor: 'action.hover', borderRadius: 3, p: 4, maxWidth: 380 }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Party Wise Prices are not available yet.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <ProductFormDialog open={editOpen} onClose={() => setEditOpen(false)} product={product} />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete item?"
        description={`This removes ${product.name} from your active item list. Existing orders and invoices are kept.`}
        confirmLabel="Delete"
        loading={deactivate.isPending}
        onConfirm={() => deactivate.mutate()}
        onClose={() => setDeleteOpen(false)}
      />
    </Stack>
  )
}
