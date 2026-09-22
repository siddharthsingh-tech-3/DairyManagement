import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import dayjs from 'dayjs'
import {
  addCapitalContribution,
  addCapitalInterest,
  addDrawing,
  addJointLiability,
  addLoan,
  addPartnerBankAccount,
  addProfitLossAllocation,
  addProfitLossRatio,
  addRemuneration,
  addResponsibility,
  deleteCapitalContribution,
  deleteCapitalInterest,
  deleteDrawing,
  deleteJointLiability,
  deleteLoan,
  deletePartnerBankAccount,
  deleteProfitLossAllocation,
  deleteProfitLossRatio,
  deleteRemuneration,
  deleteResponsibility,
  getBusinessPartner,
  setPrimaryPartnerBankAccount,
  updateBusinessPartner,
  updateCapitalInterest,
  updateJointLiability,
  updateLoan,
} from '@/api/businessPartners'
import type { DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PartnerFormDialog } from '@/features/business-partners/PartnerFormDialog'
import { PartnerChildRecordsCard } from '@/features/business-partners/PartnerChildRecordsCard'
import { usePermission } from '@/hooks/usePermissions'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { formatCurrency } from '@/utils/format'
import type {
  BusinessPartnerDetail,
  PartnerBankAccount,
  PartnerCapitalContribution,
  PartnerCapitalInterest,
  PartnerDrawing,
  PartnerJointLiability,
  PartnerLoan,
  PartnerProfitLossAllocation,
  PartnerProfitLossRatio,
  PartnerRemuneration,
  PartnerResponsibility,
} from '@/types/models'

const TAB_LABELS = [
  'Overview',
  'Basic Details',
  'Tax Details',
  'Bank Details',
  'Capital',
  'Profit & Loss',
  'Drawings',
  'Remuneration',
  'Interest',
  'Loans',
  'Liabilities',
  'Responsibilities',
] as const

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

// --- Capital contributions ---

const emptyContributionForm = {
  contribution_type: 'additional',
  amount: '',
  contribution_date: dayjs().format('YYYY-MM-DD'),
  note: '',
  interest_rate: '',
  interest_amount: '',
  interest_calculation_method: 'simple',
  interest_effective_date: '',
}

function CapitalTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState(emptyContributionForm)
  const hasInterestTerms = !!form.interest_rate || !!form.interest_amount
  const addMutation = useMutation({
    mutationFn: () =>
      addCapitalContribution(partner.id, {
        contribution_type: form.contribution_type as 'initial' | 'additional',
        amount: Number(form.amount),
        contribution_date: form.contribution_date,
        note: form.note || null,
        interest_rate: form.interest_rate ? Number(form.interest_rate) : null,
        interest_amount: form.interest_amount ? Number(form.interest_amount) : null,
        // Interest details only travel with a stated rate or amount — the API rejects them otherwise.
        interest_calculation_method: hasInterestTerms ? (form.interest_calculation_method as 'simple' | 'compound') : null,
        interest_effective_date: hasInterestTerms ? form.interest_effective_date || form.contribution_date : null,
      }),
    onSuccess: async () => {
      setForm({ ...emptyContributionForm, contribution_date: dayjs().format('YYYY-MM-DD') })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCapitalContribution(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerCapitalContribution>[] = [
    { key: 'date', header: 'Date', render: (r) => dayjs(r.contribution_date).format('DD/MM/YYYY') },
    { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.contribution_type} /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
    { key: 'purpose', header: 'Purpose / Remarks', render: (r) => r.note ?? '-' },
    { key: 'interest_rate', header: 'Interest Rate', align: 'right', render: (r) => (r.interest_rate != null ? `${Number(r.interest_rate)}%` : '-') },
    { key: 'interest_amount', header: 'Expected Interest', align: 'right', render: (r) => (r.interest_amount != null ? formatCurrency(r.interest_amount) : '-') },
    { key: 'interest_method', header: 'Interest Basis', render: (r) => (r.interest_calculation_method ? <StatusBadge status={r.interest_calculation_method} /> : '-') },
    { key: 'interest_from', header: 'Interest From', render: (r) => (r.interest_effective_date ? dayjs(r.interest_effective_date).format('DD/MM/YYYY') : '-') },
  ]

  return (
    <Stack spacing={2.5}>
      <SectionCard title="Opening Capital Balance">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow label="Opening Balance" value={formatCurrency(partner.opening_capital_balance)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow label="As of" value={partner.opening_balance_date ? dayjs(partner.opening_balance_date).format('DD/MM/YYYY') : 'N/A'} />
          </Grid>
        </Grid>
      </SectionCard>

      <PartnerChildRecordsCard
        title="Capital Contributions"
        rows={partner.capital_contributions}
        columns={columns}
        getRowId={(r) => r.id}
        emptyMessage="No capital contributions recorded yet."
        canEdit={canEdit}
        onDelete={(r) => deleteMutation.mutate(r.id)}
        footer={
          <>
            <Typography fontWeight={500}>
              Additional Contributions:{' '}
              <Typography component="span" fontWeight={600}>
                {formatCurrency(partner.total_additional_contributed)}
              </Typography>
            </Typography>
            <Typography fontWeight={500}>
              Expected Interest:{' '}
              <Typography component="span" fontWeight={600}>
                {formatCurrency(partner.total_expected_interest)}
              </Typography>
            </Typography>
            <Typography fontWeight={500}>
              Total Capital Contributed:{' '}
              <Typography component="span" fontWeight={600}>
                {formatCurrency(partner.total_capital_contributed)}
              </Typography>
            </Typography>
          </>
        }
        addForm={
          <Stack spacing={1.5}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={2.5}>
                <TextField select size="small" label="Type" fullWidth value={form.contribution_type} onChange={(e) => setForm((p) => ({ ...p, contribution_type: e.target.value }))}>
                  <MenuItem value="initial">Initial</MenuItem>
                  <MenuItem value="additional">Additional</MenuItem>
                </TextField>
              </Grid>
              <Grid size={2.5}>
                <TextField size="small" type="number" label="Amount (₹)" fullWidth value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              </Grid>
              <Grid size={2.5}>
                <TextField size="small" type="date" label="Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.contribution_date} onChange={(e) => setForm((p) => ({ ...p, contribution_date: e.target.value }))} />
              </Grid>
              <Grid size={4.5}>
                <TextField size="small" label="Purpose / Remarks" fullWidth value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
              </Grid>
            </Grid>
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={2.5}>
                <TextField size="small" type="number" label="Interest Rate (%)" fullWidth value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} />
              </Grid>
              <Grid size={2.5}>
                <TextField size="small" type="number" label="Interest Amount (₹)" fullWidth value={form.interest_amount} onChange={(e) => setForm((p) => ({ ...p, interest_amount: e.target.value }))} />
              </Grid>
              <Grid size={2.5}>
                <TextField select size="small" label="Interest Basis" fullWidth disabled={!hasInterestTerms} value={form.interest_calculation_method} onChange={(e) => setForm((p) => ({ ...p, interest_calculation_method: e.target.value }))}>
                  <MenuItem value="simple">Simple</MenuItem>
                  <MenuItem value="compound">Compound</MenuItem>
                </TextField>
              </Grid>
              <Grid size={3}>
                <TextField
                  size="small"
                  type="date"
                  label="Interest Effective From"
                  fullWidth
                  disabled={!hasInterestTerms}
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={form.interest_effective_date}
                  onChange={(e) => setForm((p) => ({ ...p, interest_effective_date: e.target.value }))}
                  helperText={hasInterestTerms ? 'Defaults to the contribution date' : 'Enter a rate or amount first'}
                />
              </Grid>
              <Grid size={1.5}>
                <Button fullWidth variant="outlined" disabled={addMutation.isPending || !form.amount} onClick={() => addMutation.mutate()}>
                  Add
                </Button>
              </Grid>
            </Grid>
          </Stack>
        }
      />
    </Stack>
  )
}

// --- Bank details ---

const emptyBankAccountForm = { account_number: '', account_holder_name: '', bank_name: '', ifsc_code: '', branch_name: '' }

function BankDetailsTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState(emptyBankAccountForm)
  const addMutation = useMutation({
    mutationFn: () =>
      addPartnerBankAccount(partner.id, {
        account_number: form.account_number.trim(),
        account_holder_name: form.account_holder_name.trim() || null,
        bank_name: form.bank_name.trim() || null,
        ifsc_code: form.ifsc_code.trim().toUpperCase() || null,
        branch_name: form.branch_name.trim() || null,
      }),
    onSuccess: async () => {
      setForm(emptyBankAccountForm)
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePartnerBankAccount(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const primaryMutation = useMutation({
    mutationFn: (id: string) => setPrimaryPartnerBankAccount(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerBankAccount>[] = [
    { key: 'account_number', header: 'Account Number', render: (r) => r.account_number },
    { key: 'holder', header: 'Account Holder', render: (r) => r.account_holder_name ?? '-' },
    { key: 'bank', header: 'Bank', render: (r) => r.bank_name ?? '-' },
    { key: 'ifsc', header: 'IFSC Code', render: (r) => r.ifsc_code ?? '-' },
    { key: 'branch', header: 'Branch', render: (r) => r.branch_name ?? '-' },
    { key: 'primary', header: 'Payout Account', render: (r) => (r.is_primary ? <StatusBadge status="active" label="Primary" /> : '-') },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: '',
            render: (r: PartnerBankAccount) =>
              r.is_primary ? null : (
                <Button size="small" onClick={() => primaryMutation.mutate(r.id)}>
                  Make Primary
                </Button>
              ),
          },
        ]
      : []),
  ]

  return (
    <PartnerChildRecordsCard
      title="Bank Account Details"
      rows={partner.bank_accounts}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No bank accounts recorded yet."
      canEdit={canEdit}
      onDelete={(r) => deleteMutation.mutate(r.id)}
      addForm={
        <Stack spacing={1.5}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={4}>
              <TextField size="small" label="Bank Account Number *" fullWidth value={form.account_number} onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))} />
            </Grid>
            <Grid size={4}>
              <TextField size="small" label="Account Holder Name" fullWidth value={form.account_holder_name} onChange={(e) => setForm((p) => ({ ...p, account_holder_name: e.target.value }))} />
            </Grid>
            <Grid size={4}>
              <TextField size="small" label="Bank Name" fullWidth value={form.bank_name} onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))} />
            </Grid>
          </Grid>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={4}>
              <TextField size="small" label="IFSC Code" placeholder="11-character IFSC" fullWidth value={form.ifsc_code} onChange={(e) => setForm((p) => ({ ...p, ifsc_code: e.target.value }))} />
            </Grid>
            <Grid size={4}>
              <TextField size="small" label="Branch Name" fullWidth value={form.branch_name} onChange={(e) => setForm((p) => ({ ...p, branch_name: e.target.value }))} />
            </Grid>
            <Grid size={4}>
              <Button fullWidth variant="outlined" disabled={addMutation.isPending || form.account_number.trim().length < 4} onClick={() => addMutation.mutate()}>
                Add Account
              </Button>
            </Grid>
          </Grid>
        </Stack>
      }
    />
  )
}

// --- Profit & loss ratios ---

function ProfitLossTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState({ profit_percentage: '', loss_percentage: '', effective_date: dayjs().format('YYYY-MM-DD'), note: '' })
  const addMutation = useMutation({
    mutationFn: () =>
      addProfitLossRatio(partner.id, {
        profit_percentage: Number(form.profit_percentage),
        loss_percentage: Number(form.loss_percentage),
        effective_date: form.effective_date,
        note: form.note || null,
      }),
    onSuccess: async () => {
      setForm({ profit_percentage: '', loss_percentage: '', effective_date: dayjs().format('YYYY-MM-DD'), note: '' })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProfitLossRatio(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const allocationForm = useProfitLossAllocationForm(partner, invalidate, toast)

  const ratioColumns: DataTableColumn<PartnerProfitLossRatio>[] = [
    { key: 'date', header: 'Effective Date', render: (r) => dayjs(r.effective_date).format('DD/MM/YYYY') },
    { key: 'profit', header: 'Profit %', align: 'right', render: (r) => `${Number(r.profit_percentage)}%` },
    { key: 'loss', header: 'Loss %', align: 'right', render: (r) => `${Number(r.loss_percentage)}%` },
    { key: 'note', header: 'Note', render: (r) => r.note ?? '-' },
  ]

  const allocationColumns: DataTableColumn<PartnerProfitLossAllocation>[] = [
    { key: 'date', header: 'Date', render: (r) => dayjs(r.allocation_date).format('DD/MM/YYYY') },
    { key: 'period', header: 'Period', render: (r) => r.period_label ?? '-' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => (
        <Typography fontWeight={500} color={Number(r.amount) < 0 ? 'error.main' : 'success.main'}>
          {Number(r.amount) < 0 ? '−' : ''}
          {formatCurrency(Math.abs(Number(r.amount)))}
        </Typography>
      ),
    },
    { key: 'note', header: 'Note', render: (r) => r.note ?? '-' },
  ]

  return (
    <Stack spacing={2.5}>
      <SectionCard title="Current Ratio">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow label="Profit Sharing %" value={partner.current_profit_percentage != null ? `${Number(partner.current_profit_percentage)}%` : 'Not set'} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow label="Loss Sharing %" value={partner.current_loss_percentage != null ? `${Number(partner.current_loss_percentage)}%` : 'Not set'} />
          </Grid>
        </Grid>
      </SectionCard>

      <PartnerChildRecordsCard
        title="Profit & Loss Sharing Ratio History"
        rows={partner.profit_loss_ratios}
        columns={ratioColumns}
        getRowId={(r) => r.id}
        emptyMessage="No profit/loss ratio recorded yet."
        canEdit={canEdit}
        onDelete={(r) => deleteMutation.mutate(r.id)}
        addForm={
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={2.5}>
              <TextField size="small" type="number" label="Profit %" fullWidth value={form.profit_percentage} onChange={(e) => setForm((p) => ({ ...p, profit_percentage: e.target.value }))} />
            </Grid>
            <Grid size={2.5}>
              <TextField size="small" type="number" label="Loss %" fullWidth value={form.loss_percentage} onChange={(e) => setForm((p) => ({ ...p, loss_percentage: e.target.value }))} />
            </Grid>
            <Grid size={2.5}>
              <TextField size="small" type="date" label="Effective Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} />
            </Grid>
            <Grid size={3}>
              <TextField size="small" label="Note" fullWidth value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />
            </Grid>
            <Grid size={1.5}>
              <Button fullWidth variant="outlined" disabled={addMutation.isPending || !form.profit_percentage || !form.loss_percentage} onClick={() => addMutation.mutate()}>
                Add
              </Button>
            </Grid>
          </Grid>
        }
      />

      <PartnerChildRecordsCard
        title="Profit / Loss Allocations"
        rows={partner.profit_loss_allocations}
        columns={allocationColumns}
        getRowId={(r) => r.id}
        emptyMessage="No profit/loss allocations recorded yet. These feed the Capital Account Balance."
        canEdit={canEdit}
        onDelete={(r) => allocationForm.deleteMutation.mutate(r.id)}
        addForm={allocationForm.formEl}
      />
    </Stack>
  )
}

function useProfitLossAllocationForm(
  partner: BusinessPartnerDetail,
  invalidate: () => Promise<void>,
  toast: (msg: string, variant?: 'error') => void,
) {
  const [kind, setKind] = useState<'profit' | 'loss'>('profit')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [periodLabel, setPeriodLabel] = useState('')

  const addMutation = useMutation({
    mutationFn: () =>
      addProfitLossAllocation(partner.id, {
        amount: kind === 'profit' ? Number(amount) : -Number(amount),
        allocation_date: date,
        period_label: periodLabel || null,
      }),
    onSuccess: async () => {
      setAmount('')
      setPeriodLabel('')
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProfitLossAllocation(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const formEl = (
    <Grid container spacing={1.5} alignItems="center">
      <Grid size={2}>
        <TextField select size="small" label="Type" fullWidth value={kind} onChange={(e) => setKind(e.target.value as 'profit' | 'loss')}>
          <MenuItem value="profit">Profit</MenuItem>
          <MenuItem value="loss">Loss</MenuItem>
        </TextField>
      </Grid>
      <Grid size={2.5}>
        <TextField size="small" type="number" label="Amount (₹)" fullWidth value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Grid>
      <Grid size={2.5}>
        <TextField size="small" type="date" label="Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={date} onChange={(e) => setDate(e.target.value)} />
      </Grid>
      <Grid size={3.5}>
        <TextField size="small" label="Period (e.g. FY 2025-26 Q1)" fullWidth value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} />
      </Grid>
      <Grid size={1.5}>
        <Button fullWidth variant="outlined" disabled={addMutation.isPending || !amount} onClick={() => addMutation.mutate()}>
          Add
        </Button>
      </Grid>
    </Grid>
  )

  return { formEl, deleteMutation }
}

// --- Drawings ---

function DrawingsTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState({ amount: '', drawing_date: dayjs().format('YYYY-MM-DD'), description: '' })
  const addMutation = useMutation({
    mutationFn: () => addDrawing(partner.id, { amount: Number(form.amount), drawing_date: form.drawing_date, description: form.description || null }),
    onSuccess: async () => {
      setForm({ amount: '', drawing_date: dayjs().format('YYYY-MM-DD'), description: '' })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDrawing(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerDrawing>[] = [
    { key: 'date', header: 'Date', render: (r) => dayjs(r.drawing_date).format('DD/MM/YYYY') },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
    { key: 'description', header: 'Description', render: (r) => r.description ?? '-' },
  ]

  return (
    <PartnerChildRecordsCard
      title="Partner Drawings"
      rows={partner.drawings}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No drawings recorded yet."
      canEdit={canEdit}
      onDelete={(r) => deleteMutation.mutate(r.id)}
      footer={
        <Typography fontWeight={500}>
          Total Drawings:{' '}
          <Typography component="span" fontWeight={600} color="error.main">
            {formatCurrency(partner.total_drawings)}
          </Typography>
        </Typography>
      }
      addForm={
        <Grid container spacing={1.5} alignItems="center">
          <Grid size={3}>
            <TextField size="small" type="number" label="Amount (₹)" fullWidth value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          </Grid>
          <Grid size={3}>
            <TextField size="small" type="date" label="Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.drawing_date} onChange={(e) => setForm((p) => ({ ...p, drawing_date: e.target.value }))} />
          </Grid>
          <Grid size={4.5}>
            <TextField size="small" label="Description / Reason" fullWidth value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </Grid>
          <Grid size={1.5}>
            <Button fullWidth variant="outlined" disabled={addMutation.isPending || !form.amount} onClick={() => addMutation.mutate()}>
              Add
            </Button>
          </Grid>
        </Grid>
      }
    />
  )
}

// --- Remuneration ---

function RemunerationTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState({ remuneration_type: 'salary', amount: '', frequency: 'monthly', effective_date: dayjs().format('YYYY-MM-DD'), description: '' })
  const addMutation = useMutation({
    mutationFn: () =>
      addRemuneration(partner.id, {
        remuneration_type: form.remuneration_type as 'salary' | 'commission' | 'bonus' | 'other',
        amount: Number(form.amount),
        frequency: form.frequency as 'monthly' | 'quarterly' | 'annually' | 'one_time',
        effective_date: form.effective_date,
        description: form.description || null,
      }),
    onSuccess: async () => {
      setForm({ remuneration_type: 'salary', amount: '', frequency: 'monthly', effective_date: dayjs().format('YYYY-MM-DD'), description: '' })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRemuneration(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerRemuneration>[] = [
    { key: 'date', header: 'Effective Date', render: (r) => dayjs(r.effective_date).format('DD/MM/YYYY') },
    { key: 'type', header: 'Type', render: (r) => <StatusBadge status={r.remuneration_type} /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => formatCurrency(r.amount) },
    { key: 'frequency', header: 'Frequency', render: (r) => r.frequency.replace('_', ' ') },
    { key: 'description', header: 'Description', render: (r) => r.description ?? '-' },
  ]

  return (
    <PartnerChildRecordsCard
      title="Partner Salaries / Remuneration"
      rows={partner.remunerations}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No remuneration terms recorded yet."
      canEdit={canEdit}
      onDelete={(r) => deleteMutation.mutate(r.id)}
      addForm={
        <Grid container spacing={1.5} alignItems="center">
          <Grid size={2}>
            <TextField select size="small" label="Type" fullWidth value={form.remuneration_type} onChange={(e) => setForm((p) => ({ ...p, remuneration_type: e.target.value }))}>
              <MenuItem value="salary">Salary</MenuItem>
              <MenuItem value="commission">Commission</MenuItem>
              <MenuItem value="bonus">Bonus</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid size={2}>
            <TextField size="small" type="number" label="Amount (₹)" fullWidth value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
          </Grid>
          <Grid size={2}>
            <TextField select size="small" label="Frequency" fullWidth value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="annually">Annually</MenuItem>
              <MenuItem value="one_time">One-time</MenuItem>
            </TextField>
          </Grid>
          <Grid size={2}>
            <TextField size="small" type="date" label="Effective Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} />
          </Grid>
          <Grid size={2.5}>
            <TextField size="small" label="Description" fullWidth value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </Grid>
          <Grid size={1.5}>
            <Button fullWidth variant="outlined" disabled={addMutation.isPending || !form.amount} onClick={() => addMutation.mutate()}>
              Add
            </Button>
          </Grid>
        </Grid>
      }
    />
  )
}

// --- Interest on capital ---

function InterestTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState({ interest_rate: '', calculation_method: 'simple', effective_date: dayjs().format('YYYY-MM-DD'), interest_amount: '' })
  const addMutation = useMutation({
    mutationFn: () =>
      addCapitalInterest(partner.id, {
        interest_rate: Number(form.interest_rate),
        calculation_method: form.calculation_method as 'simple' | 'compound',
        effective_date: form.effective_date,
        interest_amount: Number(form.interest_amount),
      }),
    onSuccess: async () => {
      setForm({ interest_rate: '', calculation_method: 'simple', effective_date: dayjs().format('YYYY-MM-DD'), interest_amount: '' })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCapitalInterest(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const markPaidMutation = useMutation({
    mutationFn: (id: string) => updateCapitalInterest(partner.id, id, { payment_status: 'paid' }),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerCapitalInterest>[] = [
    { key: 'date', header: 'Effective Date', render: (r) => dayjs(r.effective_date).format('DD/MM/YYYY') },
    { key: 'rate', header: 'Rate', align: 'right', render: (r) => `${Number(r.interest_rate)}%` },
    { key: 'method', header: 'Method', render: (r) => <StatusBadge status={r.calculation_method} /> },
    { key: 'amount', header: 'Interest Amount', align: 'right', render: (r) => formatCurrency(r.interest_amount) },
    { key: 'status', header: 'Payment Status', render: (r) => <StatusBadge status={r.payment_status} /> },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: '',
            render: (r: PartnerCapitalInterest) =>
              r.payment_status === 'pending' ? (
                <Button size="small" onClick={() => markPaidMutation.mutate(r.id)}>
                  Mark Paid
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <PartnerChildRecordsCard
      title="Interest on Capital Accounts"
      rows={partner.capital_interest_entries}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No interest entries recorded yet."
      canEdit={canEdit}
      onDelete={(r) => deleteMutation.mutate(r.id)}
      addForm={
        <Grid container spacing={1.5} alignItems="center">
          <Grid size={2.5}>
            <TextField size="small" type="number" label="Interest Rate (%)" fullWidth value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} />
          </Grid>
          <Grid size={2.5}>
            <TextField select size="small" label="Calculation Method" fullWidth value={form.calculation_method} onChange={(e) => setForm((p) => ({ ...p, calculation_method: e.target.value }))}>
              <MenuItem value="simple">Simple</MenuItem>
              <MenuItem value="compound">Compound</MenuItem>
            </TextField>
          </Grid>
          <Grid size={2.5}>
            <TextField size="small" type="date" label="Effective Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} />
          </Grid>
          <Grid size={2.5}>
            <TextField size="small" type="number" label="Interest Amount (₹)" fullWidth value={form.interest_amount} onChange={(e) => setForm((p) => ({ ...p, interest_amount: e.target.value }))} />
          </Grid>
          <Grid size={2}>
            <Button fullWidth variant="outlined" disabled={addMutation.isPending || !form.interest_rate || !form.interest_amount} onClick={() => addMutation.mutate()}>
              Add
            </Button>
          </Grid>
        </Grid>
      }
    />
  )
}

// --- Loans from partners ---

function LoansTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState({ loan_amount: '', loan_date: dayjs().format('YYYY-MM-DD'), interest_rate: '', repayment_terms: '' })
  const addMutation = useMutation({
    mutationFn: () =>
      addLoan(partner.id, {
        loan_amount: Number(form.loan_amount),
        loan_date: form.loan_date,
        interest_rate: form.interest_rate ? Number(form.interest_rate) : null,
        repayment_terms: form.repayment_terms || null,
      }),
    onSuccess: async () => {
      setForm({ loan_amount: '', loan_date: dayjs().format('YYYY-MM-DD'), interest_rate: '', repayment_terms: '' })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLoan(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const closeMutation = useMutation({
    mutationFn: (id: string) => updateLoan(partner.id, id, { outstanding_balance: 0, loan_status: 'closed' }),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerLoan>[] = [
    { key: 'date', header: 'Loan Date', render: (r) => dayjs(r.loan_date).format('DD/MM/YYYY') },
    { key: 'amount', header: 'Loan Amount', align: 'right', render: (r) => formatCurrency(r.loan_amount) },
    { key: 'rate', header: 'Interest Rate', align: 'right', render: (r) => (r.interest_rate != null ? `${Number(r.interest_rate)}%` : '-') },
    { key: 'terms', header: 'Repayment Terms', render: (r) => r.repayment_terms ?? '-' },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (r) => formatCurrency(r.outstanding_balance) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.loan_status} /> },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: '',
            render: (r: PartnerLoan) =>
              r.loan_status === 'active' ? (
                <Button size="small" onClick={() => closeMutation.mutate(r.id)}>
                  Close Loan
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <PartnerChildRecordsCard
      title="Loans from Partners"
      rows={partner.loans}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No partner loans recorded yet."
      canEdit={canEdit}
      onDelete={(r) => deleteMutation.mutate(r.id)}
      footer={
        <Typography fontWeight={500}>
          Total Outstanding:{' '}
          <Typography component="span" fontWeight={600}>
            {formatCurrency(partner.total_outstanding_loans)}
          </Typography>
        </Typography>
      }
      addForm={
        <Grid container spacing={1.5} alignItems="center">
          <Grid size={2.5}>
            <TextField size="small" type="number" label="Loan Amount (₹)" fullWidth value={form.loan_amount} onChange={(e) => setForm((p) => ({ ...p, loan_amount: e.target.value }))} />
          </Grid>
          <Grid size={2.5}>
            <TextField size="small" type="date" label="Loan Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.loan_date} onChange={(e) => setForm((p) => ({ ...p, loan_date: e.target.value }))} />
          </Grid>
          <Grid size={2}>
            <TextField size="small" type="number" label="Interest Rate (%)" fullWidth value={form.interest_rate} onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))} />
          </Grid>
          <Grid size={3}>
            <TextField size="small" label="Repayment Terms" fullWidth value={form.repayment_terms} onChange={(e) => setForm((p) => ({ ...p, repayment_terms: e.target.value }))} />
          </Grid>
          <Grid size={2}>
            <Button fullWidth variant="outlined" disabled={addMutation.isPending || !form.loan_amount} onClick={() => addMutation.mutate()}>
              Add
            </Button>
          </Grid>
        </Grid>
      }
    />
  )
}

// --- Joint liabilities ---

function LiabilitiesTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState({ liability_type: '', description: '', total_liability_amount: '', share_percentage: '', outstanding_amount: '', due_date: '' })
  const addMutation = useMutation({
    mutationFn: () =>
      addJointLiability(partner.id, {
        liability_type: form.liability_type,
        description: form.description || null,
        total_liability_amount: Number(form.total_liability_amount),
        share_percentage: Number(form.share_percentage),
        outstanding_amount: Number(form.outstanding_amount),
        due_date: form.due_date || null,
      }),
    onSuccess: async () => {
      setForm({ liability_type: '', description: '', total_liability_amount: '', share_percentage: '', outstanding_amount: '', due_date: '' })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJointLiability(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const settleMutation = useMutation({
    mutationFn: (id: string) => updateJointLiability(partner.id, id, { outstanding_amount: 0, status: 'settled' }),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerJointLiability>[] = [
    { key: 'type', header: 'Liability Type', render: (r) => r.liability_type },
    { key: 'description', header: 'Description', render: (r) => r.description ?? '-' },
    { key: 'total', header: 'Total Amount', align: 'right', render: (r) => formatCurrency(r.total_liability_amount) },
    { key: 'share', header: 'Share %', align: 'right', render: (r) => `${Number(r.share_percentage)}%` },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (r) => formatCurrency(r.outstanding_amount) },
    { key: 'due', header: 'Due Date', render: (r) => (r.due_date ? dayjs(r.due_date).format('DD/MM/YYYY') : '-') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(canEdit
      ? [
          {
            key: 'action',
            header: '',
            render: (r: PartnerJointLiability) =>
              r.status !== 'settled' ? (
                <Button size="small" onClick={() => settleMutation.mutate(r.id)}>
                  Mark Settled
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  return (
    <PartnerChildRecordsCard
      title="Joint Liabilities"
      rows={partner.joint_liabilities}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No joint liabilities recorded yet."
      canEdit={canEdit}
      onDelete={(r) => deleteMutation.mutate(r.id)}
      footer={
        <Typography fontWeight={500}>
          Total Outstanding:{' '}
          <Typography component="span" fontWeight={600}>
            {formatCurrency(partner.total_outstanding_liabilities)}
          </Typography>
        </Typography>
      }
      addForm={
        <Stack spacing={1.5}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={3}>
              <TextField size="small" label="Liability Type" fullWidth value={form.liability_type} onChange={(e) => setForm((p) => ({ ...p, liability_type: e.target.value }))} />
            </Grid>
            <Grid size={4}>
              <TextField size="small" label="Description" fullWidth value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid size={2.5}>
              <TextField size="small" type="date" label="Due Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
            </Grid>
          </Grid>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={3}>
              <TextField size="small" type="number" label="Total Liability Amount (₹)" fullWidth value={form.total_liability_amount} onChange={(e) => setForm((p) => ({ ...p, total_liability_amount: e.target.value }))} />
            </Grid>
            <Grid size={2.5}>
              <TextField size="small" type="number" label="Partner's Share %" fullWidth value={form.share_percentage} onChange={(e) => setForm((p) => ({ ...p, share_percentage: e.target.value }))} />
            </Grid>
            <Grid size={3}>
              <TextField size="small" type="number" label="Outstanding Amount (₹)" fullWidth value={form.outstanding_amount} onChange={(e) => setForm((p) => ({ ...p, outstanding_amount: e.target.value }))} />
            </Grid>
            <Grid size={2}>
              <Button
                fullWidth
                variant="outlined"
                disabled={addMutation.isPending || !form.liability_type || !form.total_liability_amount}
                onClick={() => addMutation.mutate()}
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </Stack>
      }
    />
  )
}

// --- Operational responsibilities ---

function ResponsibilitiesTab({ partner, canEdit, invalidate, toast }: SectionProps) {
  const [form, setForm] = useState({
    role_title: '',
    description: '',
    financial_decision_authority: false,
    approval_authority: false,
    effective_date: dayjs().format('YYYY-MM-DD'),
    notes: '',
  })
  const addMutation = useMutation({
    mutationFn: () =>
      addResponsibility(partner.id, {
        role_title: form.role_title,
        description: form.description || null,
        financial_decision_authority: form.financial_decision_authority,
        approval_authority: form.approval_authority,
        effective_date: form.effective_date,
        notes: form.notes || null,
      }),
    onSuccess: async () => {
      setForm({ role_title: '', description: '', financial_decision_authority: false, approval_authority: false, effective_date: dayjs().format('YYYY-MM-DD'), notes: '' })
      await invalidate()
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteResponsibility(partner.id, id),
    onSuccess: invalidate,
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  const columns: DataTableColumn<PartnerResponsibility>[] = [
    { key: 'role', header: 'Responsibility / Role', render: (r) => r.role_title },
    { key: 'description', header: 'Description', render: (r) => r.description ?? '-' },
    { key: 'financial', header: 'Financial Authority', render: (r) => (r.financial_decision_authority ? 'Yes' : 'No') },
    { key: 'approval', header: 'Approval Authority', render: (r) => (r.approval_authority ? 'Yes' : 'No') },
    { key: 'date', header: 'Effective Date', render: (r) => dayjs(r.effective_date).format('DD/MM/YYYY') },
    { key: 'notes', header: 'Notes', render: (r) => r.notes ?? '-' },
  ]

  return (
    <PartnerChildRecordsCard
      title="Operational Responsibilities"
      rows={partner.responsibilities}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="No responsibilities recorded yet."
      canEdit={canEdit}
      onDelete={(r) => deleteMutation.mutate(r.id)}
      addForm={
        <Stack spacing={1.5}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={4}>
              <TextField size="small" label="Responsibility / Role" fullWidth value={form.role_title} onChange={(e) => setForm((p) => ({ ...p, role_title: e.target.value }))} />
            </Grid>
            <Grid size={5}>
              <TextField size="small" label="Description" fullWidth value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid size={3}>
              <TextField size="small" type="date" label="Effective Date" fullWidth slotProps={{ inputLabel: { shrink: true } }} value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Checkbox size="small" checked={form.financial_decision_authority} onChange={(e) => setForm((p) => ({ ...p, financial_decision_authority: e.target.checked }))} />}
              label="Financial Decision-Making Authority"
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={form.approval_authority} onChange={(e) => setForm((p) => ({ ...p, approval_authority: e.target.checked }))} />}
              label="Approval Authority"
            />
          </Stack>
          <Grid container spacing={1.5} alignItems="center">
            <Grid size={9}>
              <TextField size="small" label="Additional Notes" fullWidth value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </Grid>
            <Grid size={3}>
              <Button fullWidth variant="outlined" disabled={addMutation.isPending || !form.role_title} onClick={() => addMutation.mutate()}>
                Add
              </Button>
            </Grid>
          </Grid>
        </Stack>
      }
    />
  )
}

/** "HDFC Bank •••• 2233" for the account payouts default to. */
function primaryAccountLabel(partner: BusinessPartnerDetail): string {
  const account = partner.bank_accounts.find((a) => a.is_primary) ?? partner.bank_accounts[0]
  if (!account) return 'Not set'
  const masked = `•••• ${account.account_number.slice(-4)}`
  return account.bank_name ? `${account.bank_name} ${masked}` : masked
}

interface SectionProps {
  partner: BusinessPartnerDetail
  canEdit: boolean
  invalidate: () => Promise<void>
  toast: (msg: string, variant?: 'error') => void
}

export function BusinessPartnerDetailPage() {
  const { partnerId } = useParams<{ partnerId: string }>()
  const navigate = useNavigate()
  const { can } = usePermission('business_partners')
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const { data: partner, isLoading } = useQuery({
    queryKey: ['business-partners', partnerId],
    queryFn: () => getBusinessPartner(partnerId!),
    enabled: !!partnerId,
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['business-partners', partnerId] })
    await queryClient.invalidateQueries({ queryKey: ['business-partners'] })
  }

  const toggleStatus = useMutation({
    mutationFn: () => updateBusinessPartner(partnerId!, { status: partner!.status === 'active' ? 'inactive' : 'active' }),
    onSuccess: async () => {
      toast(partner!.status === 'active' ? 'Partner deactivated' : 'Partner reactivated')
      await invalidate()
      setStatusDialogOpen(false)
    },
    onError: (e) => toast(extractErrorMessage(e), 'error'),
  })

  if (isLoading || !partner) return <LoadingScreen />

  const canEdit = can('full')

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
          <IconButton size="small" onClick={() => navigate('/business-partners')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography fontWeight={600} fontSize={17}>
                {partner.name}
              </Typography>
              <StatusBadge status={partner.status} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Business Partner
            </Typography>
          </Box>
        </Stack>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<EditIcon fontSize="small" />} onClick={() => setEditOpen(true)}>
              Edit Partner
            </Button>
            <Button
              variant="outlined"
              color={partner.status === 'active' ? 'error' : 'success'}
              startIcon={partner.status === 'active' ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
              onClick={() => setStatusDialogOpen(true)}
            >
              {partner.status === 'active' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Stack>
        )}
      </Stack>

      <Box sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TAB_LABELS.map((label) => (
            <Tab key={label} label={label} sx={{ fontWeight: 500 }} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {tab === 0 && (
          <Stack spacing={2.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryTile label="Capital Account Balance" value={formatCurrency(partner.current_capital_balance)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryTile
                  label="Profit / Loss Share"
                  value={partner.current_profit_percentage != null ? `${Number(partner.current_profit_percentage)}% / ${Number(partner.current_loss_percentage)}%` : 'Not set'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryTile label="Total Drawings" value={formatCurrency(partner.total_drawings)} color="error.main" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <SummaryTile label="Outstanding Loans" value={formatCurrency(partner.total_outstanding_loans)} />
              </Grid>
            </Grid>
            <SectionCard title="Additional Capital & Payout">
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Additional Contributions" value={formatCurrency(partner.total_additional_contributed)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Expected Interest on Contributions" value={formatCurrency(partner.total_expected_interest)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <InfoRow label="Payout Account" value={primaryAccountLabel(partner)} />
                </Grid>
              </Grid>
            </SectionCard>
            <SectionCard title="Capital Account Balance Breakdown">
              <Grid container spacing={3}>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <InfoRow label="Opening Balance" value={formatCurrency(partner.opening_capital_balance)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <InfoRow label="+ Contributions" value={formatCurrency(partner.total_capital_contributed)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <InfoRow label="− Drawings" value={formatCurrency(partner.total_drawings)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <InfoRow label="Outstanding Liabilities" value={formatCurrency(partner.total_outstanding_liabilities)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <InfoRow label="= Current Balance" value={formatCurrency(partner.current_capital_balance)} />
                </Grid>
              </Grid>
            </SectionCard>
          </Stack>
        )}

        {tab === 1 && (
          <SectionCard title="Basic Details">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Partner Name" value={partner.name} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Address" value={partner.address} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Phone" value={partner.phone ?? 'N/A'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Email" value={partner.email ?? 'N/A'} />
              </Grid>
            </Grid>
          </SectionCard>
        )}

        {tab === 2 && (
          <SectionCard title="Tax Details">
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Tax Identification Number (TIN)" value={partner.tin ?? 'N/A'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="PAN Number" value={partner.pan_number ?? 'N/A'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="GSTIN" value={partner.gstin ?? 'N/A'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoRow label="Other Tax Details" value={partner.other_tax_details ?? 'N/A'} />
              </Grid>
            </Grid>
          </SectionCard>
        )}

        {tab === 3 && <BankDetailsTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 4 && <CapitalTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 5 && <ProfitLossTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 6 && <DrawingsTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 7 && <RemunerationTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 8 && <InterestTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 9 && <LoansTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 10 && <LiabilitiesTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
        {tab === 11 && <ResponsibilitiesTab partner={partner} canEdit={canEdit} invalidate={invalidate} toast={toast} />}
      </Box>

      <PartnerFormDialog open={editOpen} onClose={() => setEditOpen(false)} partner={partner} />
      <ConfirmDialog
        open={statusDialogOpen}
        title={partner.status === 'active' ? 'Deactivate partner?' : 'Reactivate partner?'}
        description={
          partner.status === 'active'
            ? `${partner.name} will be marked inactive. All recorded history is kept.`
            : `${partner.name} will be marked active again.`
        }
        confirmLabel={partner.status === 'active' ? 'Deactivate' : 'Reactivate'}
        loading={toggleStatus.isPending}
        onConfirm={() => toggleStatus.mutate()}
        onClose={() => setStatusDialogOpen(false)}
      />
    </Stack>
  )
}
