import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid2 as Grid,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import AddIcon from '@mui/icons-material/Add'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { listProducts, reorderStock, updateProduct } from '@/api/products'
import { listOffers } from '@/api/offers'
import { StatCard } from '@/components/StatCard'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { CategorySelect } from '@/components/CategorySelect'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { QuickAddItemsDialog } from '@/features/products/QuickAddItemsDialog'
import { BulkAddCsvDialog } from '@/features/products/BulkAddCsvDialog'
import { BulkEditDialog } from '@/features/products/BulkEditDialog'
import { OffersBanner } from '@/features/products/OffersBanner'
import { ManageOffersDialog } from '@/features/products/ManageOffersDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCompactCurrency } from '@/utils/format'
import { brand } from '@/theme/theme'
import type { Offer, Product } from '@/types/models'

function getEffectivePrice(product: Product, offers: Offer[]) {
  const rate = Number(product.rate)
  const applicable = offers.filter((o) => o.is_running && (o.applies_to_all || o.product_ids.includes(product.id)))
  if (applicable.length === 0) return { price: rate, hasOffer: false }
  let best = rate
  for (const o of applicable) {
    const value = Number(o.discount_value)
    const discounted = o.discount_type === 'percent' ? rate * (1 - value / 100) : rate - value
    if (discounted < best) best = discounted
  }
  best = Math.max(0, best)
  return { price: best, hasOffer: best < rate }
}

export function ProductsPage() {
  const { can } = usePermission('products')
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [offersOpen, setOffersOpen] = useState(false)
  const [offersCreateMode, setOffersCreateMode] = useState(false)
  const [bulkActionsAnchor, setBulkActionsAnchor] = useState<HTMLElement | null>(null)
  const [rowMenuAnchor, setRowMenuAnchor] = useState<HTMLElement | null>(null)
  const [rowMenuProduct, setRowMenuProduct] = useState<Product | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const { data: offers = [] } = useQuery({ queryKey: ['offers'], queryFn: listOffers })

  const reorder = useMutation({
    mutationFn: reorderStock,
    onSuccess: async () => {
      toast('Purchase order raised — stock replenished')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const toggleActive = useMutation({
    mutationFn: (p: Product) => updateProduct(p.id, { is_active: !p.is_active }),
    onSuccess: async () => {
      toast('Item updated')
      await queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (lowStockOnly && !p.is_low_stock) return false
      if (categoryFilter && p.category !== categoryFilter) return false
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.batch_no?.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [products, search, categoryFilter, lowStockOnly])

  const stats = useMemo(() => {
    const units = products.reduce((s, p) => s + p.current_stock, 0)
    const low = products.filter((p) => p.is_low_stock).length
    const value = products.reduce((s, p) => s + p.current_stock * Number(p.rate), 0)
    return { units, low, value }
  }, [products])

  const closeRowMenu = () => {
    setRowMenuAnchor(null)
    setRowMenuProduct(null)
  }

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Item name',
      sortValue: (p) => p.name,
      render: (p) => (
        <Box>
          <Typography fontWeight={500} fontSize={13.5}>
            {p.name}
          </Typography>
          <Chip label={p.category || 'Product'} size="small" variant="outlined" sx={{ height: 18, fontSize: 10.5, mt: 0.4, fontWeight: 500 }} />
        </Box>
      ),
    },
    { key: 'sku', header: 'Item code', sortValue: (p) => p.sku, render: (p) => <Typography fontFamily="'JetBrains Mono',monospace" fontSize={12.5}>{p.sku}</Typography> },
    {
      key: 'stock',
      header: 'Stock QTY',
      align: 'right',
      sortValue: (p) => p.current_stock,
      render: (p) => (
        <Box sx={{ minWidth: 90 }}>
          <Typography variant="caption" fontWeight={500}>
            {p.current_stock} {p.unit}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.max(6, Math.min(100, Math.round((p.current_stock / (p.reorder_level * 1.8 || 1)) * 100)))}
            color={p.is_low_stock ? 'error' : 'success'}
            sx={{ height: 5, borderRadius: 4, mt: 0.5 }}
          />
        </Box>
      ),
    },
    {
      key: 'rate',
      header: 'Selling price',
      align: 'right',
      sortValue: (p) => Number(p.rate),
      render: (p) => {
        const { price, hasOffer } = getEffectivePrice(p, offers)
        if (!hasOffer) return `₹${p.rate}`
        return (
          <Box>
            <Typography variant="caption" sx={{ textDecoration: 'line-through' }} color="text.secondary">
              ₹{p.rate}
            </Typography>
            <Typography fontWeight={500} color="success.main">
              ₹{price.toFixed(2)}
            </Typography>
          </Box>
        )
      },
    },
    {
      key: 'purchase_price',
      header: 'Purchase price',
      align: 'right',
      sortValue: (p) => Number(p.purchase_price ?? 0),
      render: (p) => (p.purchase_price ? `₹${p.purchase_price}` : '—'),
    },
    {
      key: 'expiry',
      header: 'Batch / expiry',
      render: (p) => (
        <Box>
          <Typography variant="body2">{p.batch_no ?? '—'}</Typography>
          <Typography variant="caption" color={p.expiry_date && dayjs(p.expiry_date).diff(dayjs(), 'day') <= 2 ? 'warning.main' : 'text.secondary'}>
            {p.expiry_date ? `Exp ${dayjs(p.expiry_date).format('D MMM')}` : '—'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      hideable: false,
      render: (p) =>
        can('full') ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              setRowMenuAnchor(e.currentTarget)
              setRowMenuProduct(p)
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ) : null,
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Products & Stock
          </Typography>
          <Typography color="text.secondary">Live inventory · GST rates & HSN · batch & expiry tracking</Typography>
        </Box>
        {can('full') && (
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<EditNoteOutlinedIcon />}
              onClick={() => {
                setOffersCreateMode(false)
                setOffersOpen(true)
              }}
            >
              Manage Offer
            </Button>
            <Button variant="outlined" onClick={() => navigate('/reports')}>
              Reports
            </Button>
          </Stack>
        )}
      </Stack>

      {can('full') && (
        <OffersBanner
          onCreateOffer={() => {
            setOffersCreateMode(true)
            setOffersOpen(true)
          }}
        />
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Stock value"
            value={formatCompactCurrency(stats.value)}
            icon={<TrendingUpIcon fontSize="small" />}
            onClick={() => navigate('/reports/stock-summary')}
            hint={
              <Tooltip title="Sum of current stock × selling price across all items — click to open the Stock Summary report">
                <Stack direction="row" spacing={0.4} alignItems="center" component="span">
                  <InfoOutlinedIcon sx={{ fontSize: 12 }} />
                  <span>view in Reports</span>
                </Stack>
              </Tooltip>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Low stock"
            value={stats.low}
            hintColor={brand.negative}
            icon={<WarningAmberIcon fontSize="small" />}
            accentColor={stats.low > 0 ? brand.negative : undefined}
            onClick={() => navigate('/reports/low-stock-summary')}
            hint={
              <Tooltip title="Items at or below their reorder level — click to open the Low Stock Summary report">
                <Stack direction="row" spacing={0.4} alignItems="center" component="span">
                  <InfoOutlinedIcon sx={{ fontSize: 12 }} />
                  <span>view in Reports</span>
                </Stack>
              </Tooltip>
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="SKUs tracked" value={products.length} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Units in stock" value={stats.units} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Search by name, item code or batch no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <CategorySelect value={categoryFilter} onChange={setCategoryFilter} allowAll label="Category" fullWidth={false} sx={{ minWidth: 170 }} />
        <Button
          variant={lowStockOnly ? 'contained' : 'outlined'}
          color={lowStockOnly ? 'error' : 'inherit'}
          size="small"
          startIcon={<WarningAmberIcon fontSize="small" />}
          onClick={() => setLowStockOnly((v) => !v)}
        >
          Low Stock
        </Button>

        <Box sx={{ flex: 1 }} />

        {can('full') && (
          <>
            <Button
              variant="outlined"
              endIcon={<ArrowDropDownIcon />}
              onClick={(e) => setBulkActionsAnchor(e.currentTarget)}
            >
              Bulk Actions
            </Button>
            <Menu anchorEl={bulkActionsAnchor} open={!!bulkActionsAnchor} onClose={() => setBulkActionsAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setBulkActionsAnchor(null)
                  setQuickAddOpen(true)
                }}
              >
                <ListItemIcon>
                  <AddBoxOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Add Items" secondary="Quickly add multiple items at once" />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setBulkActionsAnchor(null)
                  setCsvOpen(true)
                }}
              >
                <ListItemIcon>
                  <UploadFileOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Bulk Add Items" secondary="Import items from a CSV file" />
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setBulkActionsAnchor(null)
                  navigate('/purchases/invoices/new')
                }}
              >
                <ListItemIcon>
                  <ReceiptLongOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Purchase Bill Upload" secondary="Record items via a purchase invoice" />
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setBulkActionsAnchor(null)
                  if (selectedIds.length === 0) {
                    toast('Select items in the table first', 'info')
                    return
                  }
                  setBulkEditOpen(true)
                }}
              >
                <ListItemIcon>
                  <EditNoteOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Bulk Edit" secondary="Select multiple items and edit them at once" />
              </MenuItem>
            </Menu>

            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingProduct(null); setFormOpen(true) }}>
              Create Item
            </Button>
          </>
        )}
      </Stack>

      <DataTable
        columns={columns}
        rows={filteredProducts}
        getRowId={(p) => p.id}
        emptyMessage={isLoading ? 'Loading…' : 'No items found'}
        columnVisibility
        selectable={can('full')}
        selected={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(p) => navigate(`/products/${p.id}`)}
      />

      <Menu anchorEl={rowMenuAnchor} open={!!rowMenuAnchor} onClose={closeRowMenu}>
        <MenuItem
          onClick={() => {
            if (rowMenuProduct) {
              setEditingProduct(rowMenuProduct)
              setFormOpen(true)
            }
            closeRowMenu()
          }}
        >
          Edit item
        </MenuItem>
        {rowMenuProduct?.is_low_stock && (
          <MenuItem
            onClick={() => {
              if (rowMenuProduct) reorder.mutate(rowMenuProduct.id)
              closeRowMenu()
            }}
          >
            Reorder stock
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (rowMenuProduct) toggleActive.mutate(rowMenuProduct)
            closeRowMenu()
          }}
        >
          {rowMenuProduct?.is_active ? 'Deactivate' : 'Activate'}
        </MenuItem>
      </Menu>

      <ProductFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingProduct(null)
        }}
        product={editingProduct}
      />
      <QuickAddItemsDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      <BulkAddCsvDialog open={csvOpen} onClose={() => setCsvOpen(false)} />
      <BulkEditDialog open={bulkEditOpen} onClose={() => setBulkEditOpen(false)} selectedIds={selectedIds} />
      <ManageOffersDialog
        open={offersOpen}
        onClose={() => setOffersOpen(false)}
        products={products}
        startInCreateMode={offersCreateMode}
      />
    </Stack>
  )
}
