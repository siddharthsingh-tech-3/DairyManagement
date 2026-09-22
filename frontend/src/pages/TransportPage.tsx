import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  Grid2 as Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DirectionsCarFilledOutlinedIcon from '@mui/icons-material/DirectionsCarFilledOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import CurrencyRupeeOutlinedIcon from '@mui/icons-material/CurrencyRupeeOutlined'
import dayjs from 'dayjs'
import { deleteTransport, listTransports } from '@/api/transports'
import { deleteTransportBill, listTransportBills } from '@/api/transportBills'
import { getCategoryWiseReport, getTransportSummary, getZoneWiseReport } from '@/api/transportReports'
import { KpiCard } from '@/components/KpiCard'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { DateRangeFilter, type DateRangeValue } from '@/components/DateRangeFilter'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TransportFormDialog } from '@/features/transport/TransportFormDialog'
import { TransportBillFormDialog } from '@/features/transport/TransportBillFormDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrency } from '@/utils/format'
import { brand } from '@/theme/theme'
import type { Transport, TransportBill } from '@/types/models'

type MainTab = 'overview' | 'list' | 'bills'
type BillsSubTab = 'bill_list' | 'zone_wise' | 'category_wise'

export function TransportPage() {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { can } = usePermission('transport')

  const [mainTab, setMainTab] = useState<MainTab>('overview')
  const [billsSubTab, setBillsSubTab] = useState<BillsSubTab>('bill_list')

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: 'last_365_days',
    start: dayjs().subtract(365, 'day').startOf('day'),
    end: dayjs().endOf('day'),
  })

  const [transportFormOpen, setTransportFormOpen] = useState(false)
  const [transportEditing, setTransportEditing] = useState<Transport | null>(null)
  const [transportReadOnly, setTransportReadOnly] = useState(false)
  const [transportRowMenu, setTransportRowMenu] = useState<{ anchor: HTMLElement; transport: Transport } | null>(null)
  const [deleteTransportTarget, setDeleteTransportTarget] = useState<Transport | null>(null)

  const [billFormOpen, setBillFormOpen] = useState(false)
  const [billEditing, setBillEditing] = useState<TransportBill | null>(null)
  const [billRowMenu, setBillRowMenu] = useState<{ anchor: HTMLElement; bill: TransportBill } | null>(null)
  const [deleteBillTarget, setDeleteBillTarget] = useState<TransportBill | null>(null)

  const start = dateRange.preset === 'all_time' || !dateRange.start ? undefined : dateRange.start.format('YYYY-MM-DD')
  const end = dateRange.preset === 'all_time' || !dateRange.end ? undefined : dateRange.end.format('YYYY-MM-DD')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['transport-reports', 'summary'],
    queryFn: () => getTransportSummary(),
    enabled: mainTab === 'overview',
  })

  const { data: transports = [], isLoading: transportsLoading } = useQuery({
    queryKey: ['transports'],
    queryFn: listTransports,
  })

  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['transport-bills', start, end],
    queryFn: () => listTransportBills(start, end),
    enabled: mainTab === 'bills' && billsSubTab === 'bill_list',
  })

  const { data: zoneWiseRows = [], isLoading: zoneWiseLoading } = useQuery({
    queryKey: ['transport-reports', 'zone-wise', start, end],
    queryFn: () => getZoneWiseReport(start, end),
    enabled: mainTab === 'bills' && billsSubTab === 'zone_wise',
  })

  const { data: categoryWiseRows = [], isLoading: categoryWiseLoading } = useQuery({
    queryKey: ['transport-reports', 'category-wise', start, end],
    queryFn: () => getCategoryWiseReport(start, end),
    enabled: mainTab === 'bills' && billsSubTab === 'category_wise',
  })

  const deleteTransportMutation = useMutation({
    mutationFn: (id: string) => deleteTransport(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transports'] })
      toast('Transport deleted')
      setDeleteTransportTarget(null)
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const deleteBillMutation = useMutation({
    mutationFn: (id: string) => deleteTransportBill(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transport-bills'] })
      await queryClient.invalidateQueries({ queryKey: ['transport-reports'] })
      toast('Transport bill deleted')
      setDeleteBillTarget(null)
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const openAddTransport = () => {
    setTransportEditing(null)
    setTransportReadOnly(false)
    setTransportFormOpen(true)
  }

  const openViewTransport = (t: Transport) => {
    setTransportEditing(t)
    setTransportReadOnly(!can('full'))
    setTransportFormOpen(true)
  }

  const transportColumns: DataTableColumn<Transport>[] = useMemo(
    () => [
      { key: 'name', header: 'Transport Name', sortValue: (t) => t.name, render: (t) => <Typography fontWeight={500} fontSize={13.5}>{t.name}</Typography> },
      {
        key: 'vehicle_number',
        header: 'Vehicle Number',
        sortValue: (t) => t.vehicle_number,
        render: (t) => (
          <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
            {t.vehicle_number}
          </Typography>
        ),
      },
      { key: 'ownership', header: 'Ownership', render: (t) => <StatusBadge status={t.ownership} /> },
      { key: 'measure', header: 'Measure', sortValue: (t) => t.measure, render: (t) => t.measure },
      {
        key: 'transport_average',
        header: 'Transport Average',
        align: 'right',
        sortValue: (t) => Number(t.transport_average),
        render: (t) => Number(t.transport_average).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      },
      {
        key: 'diesel_average',
        header: 'Diesel Average',
        align: 'right',
        sortValue: (t) => Number(t.diesel_average),
        render: (t) => Number(t.diesel_average).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      },
      {
        key: 'km_running_track',
        header: 'KM Running Track',
        align: 'right',
        sortValue: (t) => Number(t.km_running_track),
        render: (t) => Number(t.km_running_track).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        hideable: false,
        render: (t) => (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              setTransportRowMenu({ anchor: e.currentTarget, transport: t })
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [],
  )

  const billColumns: DataTableColumn<TransportBill>[] = useMemo(
    () => [
      { key: 'bill_date', header: 'Bill Date', sortValue: (b) => b.bill_date, render: (b) => b.bill_date },
      { key: 'transport_name', header: 'Transport', sortValue: (b) => b.transport_name, render: (b) => b.transport_name },
      {
        key: 'vehicle_number',
        header: 'Vehicle Number',
        sortValue: (b) => b.vehicle_number,
        render: (b) => (
          <Typography fontFamily="'JetBrains Mono',monospace" color="primary.main" fontWeight={500} fontSize={13}>
            {b.vehicle_number}
          </Typography>
        ),
      },
      { key: 'zone_name', header: 'Zone', sortValue: (b) => b.zone_name, render: (b) => b.zone_name },
      { key: 'category_name', header: 'Category', sortValue: (b) => b.category_name, render: (b) => b.category_name },
      { key: 'bill_number', header: 'Bill Number', sortValue: (b) => b.bill_number ?? '', render: (b) => b.bill_number ?? '-' },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortValue: (b) => Number(b.amount),
        render: (b) => (
          <Typography fontWeight={500} fontSize={13}>
            {formatCurrency(b.amount)}
          </Typography>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        hideable: false,
        render: (b) => (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              setBillRowMenu({ anchor: e.currentTarget, bill: b })
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [],
  )

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          Transport
        </Typography>
        <Typography color="text.secondary">Vehicle master list and transport bill tracking by zone and category.</Typography>
      </Box>

      <Tabs value={mainTab} onChange={(_, v: MainTab) => setMainTab(v)}>
        <Tab label="Overview" value="overview" />
        <Tab label="Transport List" value="list" />
        <Tab label="Transport Bills" value="bills" />
      </Tabs>

      {mainTab === 'overview' && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <KpiCard
              label="Total Transport"
              value={String(summary?.total_transport ?? 0)}
              hint="Vehicles in the master list"
              icon={<DirectionsCarFilledOutlinedIcon fontSize="small" />}
              color={brand.mint}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <KpiCard
              label="Own Transport"
              value={String(summary?.own_count ?? 0)}
              hint="Company-owned vehicles"
              icon={<VerifiedOutlinedIcon fontSize="small" />}
              color={brand.positive}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <KpiCard
              label="Rented Transport"
              value={String(summary?.rented_count ?? 0)}
              hint="Vehicles on rent"
              icon={<SwapHorizOutlinedIcon fontSize="small" />}
              color={brand.warning}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <KpiCard
              label="Total KM Running"
              value={Number(summary?.total_km_running ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              hint="Across the vehicle fleet"
              icon={<SpeedOutlinedIcon fontSize="small" />}
              color={brand.mint}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <KpiCard
              label="Total Transport Bill Amount"
              value={formatCurrency(summary?.total_bill_amount ?? 0)}
              hint="All transport bills to date"
              icon={<CurrencyRupeeOutlinedIcon fontSize="small" />}
              color={brand.negative}
            />
          </Grid>
          {summaryLoading && (
            <Grid size={12}>
              <Typography color="text.secondary">Loading…</Typography>
            </Grid>
          )}
        </Grid>
      )}

      {mainTab === 'list' && (
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="flex-end">
            {can('full') && (
              <Button variant="contained" onClick={openAddTransport}>
                + Add Transport
              </Button>
            )}
          </Stack>
          <DataTable
            columns={transportColumns}
            rows={transports}
            getRowId={(t) => t.id}
            searchPlaceholder="Search by transport name or vehicle number…"
            searchPredicate={(t, q) => t.name.toLowerCase().includes(q) || t.vehicle_number.toLowerCase().includes(q)}
            onRowClick={(t) => openViewTransport(t)}
            emptyMessage={transportsLoading ? 'Loading…' : 'No transport records yet'}
          />
        </Stack>
      )}

      {mainTab === 'bills' && (
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={billsSubTab}
              onChange={(_, v: BillsSubTab | null) => v && setBillsSubTab(v)}
            >
              <ToggleButton value="bill_list">Bill List</ToggleButton>
              <ToggleButton value="zone_wise">Zone-Wise</ToggleButton>
              <ToggleButton value="category_wise">Purchase Category-Wise</ToggleButton>
            </ToggleButtonGroup>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </Stack>

          {billsSubTab === 'bill_list' && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="flex-end">
                {can('full') && (
                  <Button
                    variant="contained"
                    onClick={() => {
                      setBillEditing(null)
                      setBillFormOpen(true)
                    }}
                  >
                    + Add Bill
                  </Button>
                )}
              </Stack>
              <DataTable
                columns={billColumns}
                rows={bills}
                getRowId={(b) => b.id}
                searchPlaceholder="Search by transport, zone or category…"
                searchPredicate={(b, q) =>
                  b.transport_name.toLowerCase().includes(q) ||
                  b.zone_name.toLowerCase().includes(q) ||
                  b.category_name.toLowerCase().includes(q) ||
                  (b.bill_number ?? '').toLowerCase().includes(q)
                }
                emptyMessage={billsLoading ? 'Loading…' : 'No transport bills in this period'}
              />
            </Stack>
          )}

          {billsSubTab === 'zone_wise' && (
            <Card variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Zone</TableCell>
                      <TableCell align="right">Bill Count</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {zoneWiseRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          {zoneWiseLoading ? 'Loading…' : 'No transport bills in this period'}
                        </TableCell>
                      </TableRow>
                    )}
                    {zoneWiseRows.map((r) => (
                      <TableRow key={r.zone_id} hover>
                        <TableCell>
                          <Typography color="primary" fontWeight={600} fontSize={13.5}>
                            {r.zone_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{r.bill_count}</TableCell>
                        <TableCell align="right">{formatCurrency(r.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          )}

          {billsSubTab === 'category_wise' && (
            <Card variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Bill Count</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryWiseRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                          {categoryWiseLoading ? 'Loading…' : 'No transport bills in this period'}
                        </TableCell>
                      </TableRow>
                    )}
                    {categoryWiseRows.map((r) => (
                      <TableRow key={r.category_id} hover>
                        <TableCell>
                          <Typography color="primary" fontWeight={600} fontSize={13.5}>
                            {r.category_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{r.bill_count}</TableCell>
                        <TableCell align="right">{formatCurrency(r.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Card>
          )}
        </Stack>
      )}

      <Menu anchorEl={transportRowMenu?.anchor ?? null} open={!!transportRowMenu} onClose={() => setTransportRowMenu(null)}>
        <MenuItem
          onClick={() => {
            openViewTransport(transportRowMenu!.transport)
            setTransportRowMenu(null)
          }}
        >
          View
        </MenuItem>
        {can('full') && [
          <MenuItem
            key="edit"
            onClick={() => {
              setTransportEditing(transportRowMenu!.transport)
              setTransportReadOnly(false)
              setTransportFormOpen(true)
              setTransportRowMenu(null)
            }}
          >
            Edit
          </MenuItem>,
          <MenuItem
            key="delete"
            onClick={() => {
              setDeleteTransportTarget(transportRowMenu!.transport)
              setTransportRowMenu(null)
            }}
          >
            Delete
          </MenuItem>,
        ]}
      </Menu>

      <Menu anchorEl={billRowMenu?.anchor ?? null} open={!!billRowMenu} onClose={() => setBillRowMenu(null)}>
        {can('full') && [
          <MenuItem
            key="edit"
            onClick={() => {
              setBillEditing(billRowMenu!.bill)
              setBillFormOpen(true)
              setBillRowMenu(null)
            }}
          >
            Edit
          </MenuItem>,
          <MenuItem
            key="delete"
            onClick={() => {
              setDeleteBillTarget(billRowMenu!.bill)
              setBillRowMenu(null)
            }}
          >
            Delete
          </MenuItem>,
        ]}
      </Menu>

      <TransportFormDialog
        open={transportFormOpen}
        onClose={() => setTransportFormOpen(false)}
        transport={transportEditing}
        readOnly={transportReadOnly}
      />

      <TransportBillFormDialog open={billFormOpen} onClose={() => setBillFormOpen(false)} bill={billEditing} />

      <ConfirmDialog
        open={!!deleteTransportTarget}
        title="Delete transport?"
        description={`This permanently removes "${deleteTransportTarget?.name}". Transports still referenced by bills can't be deleted.`}
        confirmLabel="Delete"
        loading={deleteTransportMutation.isPending}
        onConfirm={() => deleteTransportMutation.mutate(deleteTransportTarget!.id)}
        onClose={() => setDeleteTransportTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteBillTarget}
        title="Delete transport bill?"
        description="This permanently removes the selected transport bill."
        confirmLabel="Delete"
        loading={deleteBillMutation.isPending}
        onConfirm={() => deleteBillMutation.mutate(deleteBillTarget!.id)}
        onClose={() => setDeleteBillTarget(null)}
      />
    </Stack>
  )
}
