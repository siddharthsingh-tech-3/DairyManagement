import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Divider,
  Grid2 as Grid,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import GroupsIcon from '@mui/icons-material/Groups'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import dayjs from 'dayjs'
import { listVendors, sendVendorReminder } from '@/api/vendors'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { VendorFormDialog } from '@/features/vendors/VendorFormDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrency } from '@/utils/format'
import { brand } from '@/theme/theme'
import type { Vendor } from '@/types/models'

function toCsv(rows: Vendor[]): string {
  const header = 'Name,Category,Contact,Phone,Route,Balance\n'
  const body = rows
    .map((v) => `"${v.name}","${v.category ?? ''}","${v.contact_name}","${v.phone}","${v.route}",${v.outstanding_balance}`)
    .join('\n')
  return header + body
}

function downloadCsv(rows: Vendor[], filename: string) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function VendorsPage() {
  const navigate = useNavigate()
  const { can } = usePermission('vendors')
  const [formOpen, setFormOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<HTMLElement | null>(null)
  const [reportsMenuAnchor, setReportsMenuAnchor] = useState<HTMLElement | null>(null)
  const toast = useToastStore((s) => s.show)

  // Lists every party — customers (delivery/sale side) and suppliers (purchase side)
  // — distinguished by is_supplier; see the "Party Type" column and Type filter below.
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: () => listVendors() })

  const categories = useMemo(
    () => Array.from(new Set(vendors.map((v) => v.category).filter((c): c is string => !!c))).sort(),
    [vendors],
  )

  const filteredVendors = useMemo(
    () =>
      vendors
        .filter((v) => typeFilter === 'All Types' || (typeFilter === 'Supplier' ? v.is_supplier : !v.is_supplier))
        .filter((v) => categoryFilter === 'All Categories' || v.category === categoryFilter),
    [vendors, typeFilter, categoryFilter],
  )

  const totals = useMemo(() => {
    const toCollect = filteredVendors.reduce((sum, v) => sum + Math.max(0, Number(v.outstanding_balance)), 0)
    const toPay = filteredVendors.reduce((sum, v) => sum + Math.max(0, -Number(v.outstanding_balance)), 0)
    return { toCollect, toPay }
  }, [filteredVendors])

  const remindOne = useMutation({
    mutationFn: sendVendorReminder,
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const handleBulkRemind = async () => {
    setBulkMenuAnchor(null)
    if (selectedIds.length === 0) {
      toast('Select at least one vendor first', 'error')
      return
    }
    await Promise.all(selectedIds.map((id) => remindOne.mutateAsync(id)))
    toast(`Reminder sent to ${selectedIds.length} vendor(s)`)
    setSelectedIds([])
  }

  const handleBulkExport = () => {
    setBulkMenuAnchor(null)
    const rows = selectedIds.length > 0 ? filteredVendors.filter((v) => selectedIds.includes(v.id)) : filteredVendors
    downloadCsv(rows, `vendors-${dayjs().format('YYYY-MM-DD')}.csv`)
    toast('Vendors exported to CSV')
  }

  const handleExportAll = () => {
    setReportsMenuAnchor(null)
    downloadCsv(vendors, `all-vendors-${dayjs().format('YYYY-MM-DD')}.csv`)
    toast('Vendors exported to CSV')
  }

  const columns: DataTableColumn<Vendor>[] = [
    {
      key: 'name',
      header: 'Party Name',
      sortValue: (v) => v.name,
      render: (v) => (
        <Box>
          <Typography fontWeight={500} fontSize={13.5}>
            {v.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {v.area}
          </Typography>
        </Box>
      ),
    },
    { key: 'category', header: 'Category', sortValue: (v) => v.category ?? '', render: (v) => v.category ?? 'N/A' },
    { key: 'phone', header: 'Mobile Number', render: (v) => v.phone },
    {
      key: 'type',
      header: 'Party Type',
      sortValue: (v) => (v.is_supplier ? 'Supplier' : 'Customer'),
      render: (v) => (v.is_supplier ? 'Supplier' : 'Customer'),
      hideable: false,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      sortValue: (v) => Number(v.outstanding_balance),
      hideable: false,
      render: (v) => {
        const amount = Number(v.outstanding_balance)
        if (amount === 0) return <Typography color="text.secondary">₹0.00</Typography>
        const owedByUs = amount < 0
        return (
          <Typography fontWeight={600} color={owedByUs ? 'error.main' : 'text.primary'}>
            {formatCurrency(Math.abs(amount))}
          </Typography>
        )
      },
    },
  ]

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="To Collect"
            value={formatCurrency(totals.toCollect)}
            hint="From unpaid invoices"
            icon={<ArrowUpwardIcon fontSize="small" />}
            color={brand.positive}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="To Pay"
            value={formatCurrency(totals.toPay)}
            hint="Credit owed back to vendors"
            icon={<ArrowDownwardIcon fontSize="small" />}
            color={brand.negative}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            label="Total Vendors"
            value={String(vendors.length)}
            hint="Active vendor accounts"
            icon={<GroupsIcon fontSize="small" />}
            color={brand.mint}
          />
        </Grid>
      </Grid>

      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Vendors
            </Typography>
            <Typography color="text.secondary">Manage all your vendor accounts in one place.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {can('full') && (
              <Button variant="contained" onClick={() => setFormOpen(true)}>
                + Create vendor
              </Button>
            )}
            <Button variant="outlined" endIcon={<ExpandMoreIcon />} onClick={(e) => setBulkMenuAnchor(e.currentTarget)}>
              Bulk Actions
            </Button>
            <Menu anchorEl={bulkMenuAnchor} open={!!bulkMenuAnchor} onClose={() => setBulkMenuAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setBulkMenuAnchor(null)
                  navigate('/vendors/bulk-add')
                }}
              >
                <ListItemText primary="Bulk Add Vendors" secondary="Add many vendors at once via a grid" />
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleBulkRemind}>
                <ListItemText primary="Send reminder to selected" secondary={`${selectedIds.length} selected`} />
              </MenuItem>
              <MenuItem onClick={handleBulkExport}>
                <ListItemText primary="Export selected to CSV" />
              </MenuItem>
            </Menu>
            <Button variant="outlined" endIcon={<ExpandMoreIcon />} onClick={(e) => setReportsMenuAnchor(e.currentTarget)}>
              Reports
            </Button>
            <Menu anchorEl={reportsMenuAnchor} open={!!reportsMenuAnchor} onClose={() => setReportsMenuAnchor(null)}>
              <MenuItem onClick={handleExportAll}>
                <ListItemText primary="Export all vendors to CSV" />
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="All Types">All Types</MenuItem>
            <MenuItem value="Customer">Customer</MenuItem>
            <MenuItem value="Supplier">Supplier</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="All Categories">All Categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <DataTable
          columns={columns}
          rows={filteredVendors}
          getRowId={(v) => v.id}
          searchPlaceholder="Search by name, email, or phone…"
          searchPredicate={(v, q) =>
            v.name.toLowerCase().includes(q) || v.contact_name.toLowerCase().includes(q) || v.phone.toLowerCase().includes(q)
          }
          onRowClick={(v) => navigate(`/vendors/${v.id}`)}
          emptyMessage={isLoading ? 'Loading…' : 'No vendors yet'}
          columnVisibility
          selectable
          selected={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </Stack>

      <VendorFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Stack>
  )
}
