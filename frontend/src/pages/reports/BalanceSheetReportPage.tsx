import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import MailOutlineIcon from '@mui/icons-material/MailOutline'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import { getBalanceSheet } from '@/api/reports'
import { useToastStore } from '@/store/uiStore'
import { formatCurrencyPrecise } from '@/utils/format'
import { isFavourite, setFavourite } from '@/utils/reportFavourites'
import { usePermission } from '@/hooks/usePermissions'
import { brand } from '@/theme/theme'
import { LedgerEntryDialog } from '@/features/reports/LedgerEntryDialog'
import type { LedgerEntryCategory } from '@/types/enums'

const REPORT_SLUG = 'balance-sheet'

const SECTION_TOOLTIPS: Record<string, string> = {
  Capital: 'Owner-contributed capital, tracked as manual entries.',
  'Current Liability': 'Tax payable to the government plus outstanding vendor purchase invoices.',
  Loans: 'Loans taken by the business, tracked as manual entries.',
  'Net Income': 'Cumulative revenue across all sales minus all expenses recorded so far.',
  'Current Assets': 'Tax receivable, cash, bank balance, customer dues, and stock value.',
  'Fixed Assets': 'Long-term assets such as equipment or vehicles, tracked as manual entries.',
  Investments: 'Business investments, tracked as manual entries.',
  'Loans Advance': 'Loans and advances given out, tracked as manual entries.',
}

function formatAmount(raw: string | undefined): string {
  const n = Number(raw ?? 0)
  const formatted = formatCurrencyPrecise(Math.abs(n))
  return n < 0 ? `- ${formatted}` : formatted
}

function SectionHeaderRow({ label, amount }: { label: string; amount: string | undefined }) {
  const tooltip = SECTION_TOOLTIPS[label]
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ px: 2, py: 1.1, bgcolor: brand.canvas }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography fontWeight={600} fontSize={14}>
          {label}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
          </Tooltip>
        )}
      </Stack>
      <Typography fontWeight={600} fontSize={14} fontFamily={'"JetBrains Mono", monospace'}>
        {formatAmount(amount)}
      </Typography>
    </Stack>
  )
}

function DetailRow({ label, amount, indent = 1 }: { label: string; amount: string | undefined; indent?: number }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pl: 2 + indent, pr: 2, py: 1 }}>
      <Typography fontSize={13.5} color="text.primary">
        {label}
      </Typography>
      <Typography fontSize={13.5} fontFamily={'"JetBrains Mono", monospace'}>
        {formatAmount(amount)}
      </Typography>
    </Stack>
  )
}

function AddEntryLink({ onClick }: { onClick: () => void }) {
  return (
    <Box sx={{ pl: 2, pb: 1 }}>
      <Typography
        component="button"
        onClick={onClick}
        sx={{
          border: 'none',
          background: 'none',
          p: 0,
          fontSize: 12.5,
          fontWeight: 600,
          color: 'primary.main',
          cursor: 'pointer',
        }}
      >
        + Add New Entry
      </Typography>
    </Box>
  )
}

function TotalRow({ label, amount }: { label: string; amount: string | undefined }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: brand.borderCard, mt: 'auto' }}
    >
      <Typography fontWeight={700} fontSize={14}>
        {label}
      </Typography>
      <Typography fontWeight={700} fontSize={14} fontFamily={'"JetBrains Mono", monospace'}>
        {formatAmount(amount)}
      </Typography>
    </Stack>
  )
}

export function BalanceSheetReportPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const { can } = usePermission('reports')

  const [favourite, setFavouriteState] = useState(() => isFavourite(REPORT_SLUG))
  const [addEntryCategory, setAddEntryCategory] = useState<LedgerEntryCategory | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['balance-sheet'], queryFn: getBalanceSheet })

  const toggleFavourite = () => {
    setFavouriteState((prev) => {
      setFavourite(REPORT_SLUG, !prev)
      return !prev
    })
  }

  const lastUpdated = data?.generated_at ? dayjs(data.generated_at).format('D MMM YYYY, hh:mm A') : dayjs().format('D MMM YYYY, hh:mm A')

  const handleDownloadExcel = () => {
    if (!data) return
    const rows = [
      { Section: 'LIABILITIES', Item: 'Capital', Amount: data.capital },
      { Section: '', Item: 'Tcs Payable', Amount: data.current_liability.tax_payable.tcs_payable },
      { Section: '', Item: 'Tds Payable', Amount: data.current_liability.tax_payable.tds_payable },
      { Section: '', Item: 'Account Payable', Amount: data.current_liability.account_payable },
      { Section: '', Item: 'Current Liability (Total)', Amount: data.current_liability.total },
      { Section: '', Item: 'Loans', Amount: data.loans },
      { Section: '', Item: 'Net Income', Amount: data.net_income },
      { Section: '', Item: 'Total Liabilities', Amount: data.total_liabilities },
      { Section: 'ASSETS', Item: 'Tcs Receivable', Amount: data.current_assets.tax_receivable.tcs_receivable },
      { Section: '', Item: 'Tds Receivable', Amount: data.current_assets.tax_receivable.tds_receivable },
      { Section: '', Item: 'Cash In Hand', Amount: data.current_assets.cash_in_hand },
      { Section: '', Item: 'Cash In Bank', Amount: data.current_assets.cash_in_bank },
      { Section: '', Item: 'Accounts Receivables', Amount: data.current_assets.accounts_receivable },
      { Section: '', Item: 'Inventory In Hand', Amount: data.current_assets.inventory_in_hand },
      { Section: '', Item: 'Current Assets (Total)', Amount: data.current_assets.total },
      { Section: '', Item: 'Fixed Assets', Amount: data.fixed_assets },
      { Section: '', Item: 'Investments', Amount: data.investments },
      { Section: '', Item: 'Loans Advance', Amount: data.loans_advance },
      { Section: '', Item: 'Total Assets', Amount: data.total_assets },
    ]
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet')
    XLSX.writeFile(workbook, `balance-sheet-${dayjs().format('YYYY-MM-DD')}.xlsx`)
    toast('Balance sheet downloaded')
  }

  const canEdit = can('full')

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/reports')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" fontWeight={600}>
            Balance Sheet (As of Today)
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PlayCircleOutlineIcon fontSize="small" />}
            onClick={() => toast('The how-to video is coming soon', 'info')}
          >
            Watch how to use Balance Sheet
          </Button>
        </Stack>
        <Chip
          size="small"
          variant="outlined"
          icon={favourite ? <StarIcon sx={{ fontSize: 16, color: brand.warning }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
          label="Favourite"
          onClick={toggleFavourite}
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="stretch" flexWrap="wrap" useFlexGap>
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 260,
            px: 2.5,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            borderTop: '3px solid',
            borderTopColor: brand.warningEdge,
            bgcolor: brand.warningBg,
          }}
        >
          <Typography variant="body2" sx={{ color: brand.warning }}>
            Balance sheet is updated once per day. Last updated at: <strong>{lastUpdated}</strong>
          </Typography>
        </Paper>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<MailOutlineIcon />} onClick={() => toast('Email delivery is coming soon', 'info')}>
            Email Excel
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleDownloadExcel} disabled={!data}>
            Excel Download
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} divider={<Box sx={{ width: '1px', bgcolor: brand.borderCard }} />}>
          <Stack sx={{ flex: 1 }}>
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: brand.borderCard }}>
              <Typography variant="caption" fontWeight={700} letterSpacing="0.06em" color="text.secondary">
                LIABILITIES
              </Typography>
            </Box>
            <SectionHeaderRow label="Capital" amount={data?.capital} />
            {canEdit && <AddEntryLink onClick={() => setAddEntryCategory('capital')} />}

            <SectionHeaderRow label="Current Liability" amount={data?.current_liability.total} />
            <DetailRow label="Tax Payable" amount={data?.current_liability.tax_payable.total} />
            <DetailRow label="Tcs Payable" amount={data?.current_liability.tax_payable.tcs_payable} indent={2} />
            <DetailRow label="Tds Payable" amount={data?.current_liability.tax_payable.tds_payable} indent={2} />
            <DetailRow label="Account Payable" amount={data?.current_liability.account_payable} />

            <SectionHeaderRow label="Loans" amount={data?.loans} />
            {canEdit && <AddEntryLink onClick={() => setAddEntryCategory('loans')} />}

            <SectionHeaderRow label="Net Income" amount={data?.net_income} />

            <TotalRow label="Total Liabilities" amount={data?.total_liabilities} />
          </Stack>

          <Stack sx={{ flex: 1 }}>
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: brand.borderCard }}>
              <Typography variant="caption" fontWeight={700} letterSpacing="0.06em" color="text.secondary">
                ASSETS
              </Typography>
            </Box>
            <SectionHeaderRow label="Current Assets" amount={data?.current_assets.total} />
            <DetailRow label="Tax Receivable" amount={data?.current_assets.tax_receivable.total} />
            <DetailRow label="Tcs Receivable" amount={data?.current_assets.tax_receivable.tcs_receivable} indent={2} />
            <DetailRow label="Tds Receivable" amount={data?.current_assets.tax_receivable.tds_receivable} indent={2} />
            <DetailRow label="Cash In Hand" amount={data?.current_assets.cash_in_hand} />
            <DetailRow label="Cash In Bank" amount={data?.current_assets.cash_in_bank} />
            <DetailRow label="Accounts Receivables" amount={data?.current_assets.accounts_receivable} />
            <DetailRow label="Inventory In Hand" amount={data?.current_assets.inventory_in_hand} />

            <SectionHeaderRow label="Fixed Assets" amount={data?.fixed_assets} />
            {canEdit && <AddEntryLink onClick={() => setAddEntryCategory('fixed_assets')} />}

            <SectionHeaderRow label="Investments" amount={data?.investments} />
            {canEdit && <AddEntryLink onClick={() => setAddEntryCategory('investments')} />}

            <SectionHeaderRow label="Loans Advance" amount={data?.loans_advance} />
            {canEdit && <AddEntryLink onClick={() => setAddEntryCategory('loans_advance')} />}

            <TotalRow label="Total Assets" amount={data?.total_assets} />
          </Stack>
        </Stack>
      </Paper>

      {isLoading && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Loading balance sheet…
        </Typography>
      )}

      {addEntryCategory && (
        <LedgerEntryDialog open category={addEntryCategory} onClose={() => setAddEntryCategory(null)} />
      )}
    </Stack>
  )
}
