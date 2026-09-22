import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Card, CardContent, Grid2 as Grid, Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { getCrateSummary, listCrateTransactions, listDisputes, resolveDispute } from '@/api/crates'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { ReconcileModal } from '@/features/crates/ReconcileModal'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { brand } from '@/theme/theme'
import type { CrateSummaryRow } from '@/types/models'

export function CratesPage() {
  const { can } = usePermission('crates')
  const [modalOpen, setModalOpen] = useState(false)
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const { data: summary = [], isLoading } = useQuery({ queryKey: ['crates', 'summary'], queryFn: getCrateSummary })
  const { data: txns = [] } = useQuery({ queryKey: ['crates', 'transactions'], queryFn: () => listCrateTransactions() })
  const { data: disputes = [] } = useQuery({ queryKey: ['crates', 'disputes', 'open'], queryFn: () => listDisputes('open') })

  const resolve = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => resolveDispute(id, note),
    onSuccess: async () => {
      toast('Dispute resolved')
      await queryClient.invalidateQueries({ queryKey: ['crates'] })
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const columns: DataTableColumn<CrateSummaryRow>[] = [
    { key: 'vendor', header: 'Vendor', sortValue: (r) => r.vendor_name, render: (r) => <Typography fontWeight={500} fontSize={13}>{r.vendor_name}</Typography> },
    { key: 'given', header: 'Given', align: 'right', render: (r) => r.given },
    { key: 'returned', header: 'Ret.', align: 'right', render: (r) => r.returned },
    { key: 'balance', header: 'Bal.', align: 'right', render: (r) => <Typography fontWeight={500} color="primary.main">{r.balance}</Typography> },
    { key: 'broken', header: 'Broken', align: 'right', render: (r) => <Typography color={r.broken > 0 ? 'error.main' : 'text.secondary'}>{r.broken}</Typography> },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Crate Management
          </Typography>
          <Typography color="text.secondary">Lifecycle ledger · warehouse → truck → vendor → return</Typography>
        </Box>
        {can('full') && (
          <Button variant="contained" sx={{ bgcolor: brand.ink, color: '#fff' }} onClick={() => setModalOpen(true)}>
            ⚖ Manual reconciliation
          </Button>
        )}
      </Stack>

      {disputes.map((d) => (
        <Card key={d.id} variant="outlined" sx={{ borderTop: '3px solid', borderTopColor: brand.warningEdge }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={600} color="text.primary" fontSize={13.5}>
                Crate dispute — {d.vendor_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Driver logged <b>{d.driver_reported_qty} returned</b>, vendor confirms <b>{d.vendor_confirmed_qty}</b>.
              </Typography>
            </Box>
            {can('full') && (
              <Button
                variant="contained"
                sx={{ bgcolor: brand.warning, '&:hover': { bgcolor: '#94581c' } }}
                onClick={() => resolve.mutate({ id: d.id, note: `Accepted vendor count of ${d.vendor_confirmed_qty}` })}
              >
                Resolve
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>
            Balance by vendor
          </Typography>
          <DataTable columns={columns} rows={summary} getRowId={(r) => r.vendor_id} emptyMessage={isLoading ? 'Loading…' : 'No data yet'} />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>
            Transaction ledger
          </Typography>
          <Card variant="outlined">
            <CardContent sx={{ maxHeight: 420, overflowY: 'auto' }}>
              <Stack spacing={1.5} divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
                {txns.map((t) => (
                  <Stack key={t.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {t.vendor_name} · {t.txn_type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.note}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography fontWeight={500} fontFamily="'JetBrains Mono',monospace">
                        {t.txn_type === 'issue' ? '+' : t.txn_type === 'return' ? '−' : ''}
                        {t.quantity}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(t.created_at).format('D MMM')}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
                {txns.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No transactions yet.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary">
        Records are never deleted — corrections are posted as Adjustment entries to preserve the audit trail.
      </Typography>

      <ReconcileModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </Stack>
  )
}
