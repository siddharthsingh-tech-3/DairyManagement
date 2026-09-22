import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Grid2 as Grid, Stack, Tab, Tabs, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined'
import { cancelLoan, getLoan } from '@/api/loans'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingScreen } from '@/components/LoadingScreen'
import { LoanFormDialog } from '@/features/loans/LoanFormDialog'
import { LoanScheduleTable } from '@/features/loans/LoanScheduleTable'
import { LoanPaymentDialog } from '@/features/loans/LoanPaymentDialog'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrencyPrecise } from '@/utils/format'
import type { LoanLedgerEntryRecord, LoanRepaymentRecord, LoanScheduleInstallment } from '@/types/models'

const TAB_LABELS = ['Summary', 'Repayment Schedule', 'Accounting Entries', 'Transaction History'] as const

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="primary.main" fontWeight={500}>
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
      <Typography fontWeight={600} sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function SummaryTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="caption" fontWeight={500} color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={600} color={color}>
        {value}
      </Typography>
    </Box>
  )
}

export function LoanDetailPage() {
  const { loanId } = useParams<{ loanId: string }>()
  const navigate = useNavigate()
  const { can } = usePermission('loans')
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [payingInstallment, setPayingInstallment] = useState<LoanScheduleInstallment | null | undefined>(undefined)

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loans', loanId],
    queryFn: () => getLoan(loanId!),
    enabled: !!loanId,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelLoan(loanId!),
    onSuccess: async () => {
      toast('Loan cancelled')
      await queryClient.invalidateQueries({ queryKey: ['loans'] })
      await queryClient.invalidateQueries({ queryKey: ['loans', loanId] })
      setCancelOpen(false)
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  if (isLoading || !loan) return <LoadingScreen />

  const totalPayable = Number(loan.principal_amount) + Number(loan.total_interest)
  const outstandingTotal = Number(loan.outstanding_principal) + Number(loan.outstanding_interest)
  const canEdit = can('full')

  const ledgerColumns: DataTableColumn<LoanLedgerEntryRecord>[] = [
    { key: 'created_at', header: 'Date', sortValue: (e) => e.created_at, render: (e) => new Date(e.created_at).toLocaleString() },
    { key: 'entry_type', header: 'Type', render: (e) => <StatusBadge status={e.entry_type} /> },
    { key: 'description', header: 'Description', render: (e) => e.description },
    { key: 'debit', header: 'Debit', align: 'right', render: (e) => (Number(e.debit) ? formatCurrencyPrecise(e.debit) : '—') },
    { key: 'credit', header: 'Credit', align: 'right', render: (e) => (Number(e.credit) ? formatCurrencyPrecise(e.credit) : '—') },
  ]

  const historyColumns: DataTableColumn<LoanRepaymentRecord>[] = [
    { key: 'payment_date', header: 'Date', sortValue: (r) => r.payment_date, render: (r) => r.payment_date },
    { key: 'method', header: 'Method', render: (r) => r.method.toUpperCase() },
    { key: 'principal_amount', header: 'Principal', align: 'right', render: (r) => formatCurrencyPrecise(r.principal_amount) },
    { key: 'interest_amount', header: 'Interest', align: 'right', render: (r) => formatCurrencyPrecise(r.interest_amount) },
    { key: 'tax_amount', header: 'Tax/TDS', align: 'right', render: (r) => formatCurrencyPrecise(r.tax_amount) },
    { key: 'total_amount', header: 'Total', align: 'right', render: (r) => <Typography fontWeight={600}>{formatCurrencyPrecise(r.total_amount)}</Typography> },
    { key: 'reference', header: 'Reference', render: (r) => r.reference ?? '—' },
  ]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/loans')} color="inherit">
            Back
          </Button>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" fontWeight={600}>
                {loan.loan_number}
              </Typography>
              <StatusBadge status={loan.loan_type === 'taken' ? 'due' : 'active'} label={loan.loan_type === 'taken' ? 'Loan Taken' : 'Loan Given'} />
              <StatusBadge status={loan.status} />
            </Stack>
            <Typography color="text.secondary">{loan.party_name}</Typography>
          </Box>
        </Stack>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            {loan.status === 'active' && (
              <Button variant="contained" startIcon={<PaymentsIcon />} onClick={() => setPayingInstallment(null)}>
                Record Payment
              </Button>
            )}
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            {loan.status === 'active' && Number(loan.paid_amount) === 0 && (
              <Button variant="outlined" color="error" startIcon={<BlockIcon />} onClick={() => setCancelOpen(true)}>
                Cancel Loan
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        {TAB_LABELS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryTile label="Principal Amount" value={formatCurrencyPrecise(loan.principal_amount)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryTile label="Total Interest" value={formatCurrencyPrecise(loan.total_interest)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryTile label={loan.loan_type === 'taken' ? 'Total Payable' : 'Total Receivable'} value={formatCurrencyPrecise(totalPayable)} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <SummaryTile label="Outstanding Total" value={formatCurrencyPrecise(outstandingTotal)} color="warning.main" />
            </Grid>
          </Grid>

          <SectionCard title="Loan Summary">
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Loan Type" value={loan.loan_type === 'taken' ? 'Loan Taken' : 'Loan Given'} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Party" value={loan.party_name} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Loan Date" value={loan.loan_date} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Disbursement Account" value={loan.disbursement_method.toUpperCase()} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Interest Rate" value={`${Number(loan.interest_rate)}% p.a.`} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Interest Type" value={loan.interest_type === 'simple' ? 'Simple' : 'Compound (Reducing Balance)'} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Tenure" value={`${loan.tenure_months} months`} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Repayment Frequency" value={loan.repayment_frequency.replace('_', '-')} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="First Repayment Date" value={loan.first_repayment_date} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Maturity Date" value={loan.maturity_date} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Outstanding Principal" value={formatCurrencyPrecise(loan.outstanding_principal)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <InfoRow label="Outstanding Interest" value={formatCurrencyPrecise(loan.outstanding_interest)} />
              </Grid>
              {loan.tax_type && (
                <>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <InfoRow label="Tax Type" value={loan.tax_type} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <InfoRow label="Tax Rate" value={loan.tax_rate ? `${Number(loan.tax_rate)}%` : '—'} />
                  </Grid>
                </>
              )}
              {loan.notes && (
                <Grid size={12}>
                  <InfoRow label="Notes" value={loan.notes} />
                </Grid>
              )}
            </Grid>
          </SectionCard>
        </Stack>
      )}

      {tab === 1 && (
        <LoanScheduleTable
          installments={loan.installments}
          canPay={canEdit && loan.status === 'active'}
          onPay={(installment) => setPayingInstallment(installment)}
        />
      )}

      {tab === 2 && (
        <DataTable columns={ledgerColumns} rows={loan.ledger_entries} getRowId={(e) => e.id} emptyMessage="No accounting entries yet" />
      )}

      {tab === 3 && (
        <DataTable columns={historyColumns} rows={loan.repayments} getRowId={(r) => r.id} emptyMessage="No repayments recorded yet" />
      )}

      <LoanFormDialog open={editOpen} onClose={() => setEditOpen(false)} loan={loan} />

      {payingInstallment !== undefined && (
        <LoanPaymentDialog
          open={payingInstallment !== undefined}
          onClose={() => setPayingInstallment(undefined)}
          loan={loan}
          installment={payingInstallment}
        />
      )}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this loan?"
        description="This will zero out the outstanding balance and mark the loan as cancelled. This is only possible before any repayments have been recorded."
        confirmLabel="Cancel Loan"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onClose={() => setCancelOpen(false)}
      />
    </Stack>
  )
}
