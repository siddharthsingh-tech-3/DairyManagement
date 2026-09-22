import { Button } from '@mui/material'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { formatCurrencyPrecise } from '@/utils/format'
import type { LoanScheduleInstallment } from '@/types/models'

export function LoanScheduleTable({
  installments,
  canPay,
  onPay,
}: {
  installments: LoanScheduleInstallment[]
  canPay: boolean
  onPay?: (installment: LoanScheduleInstallment) => void
}) {
  const columns: DataTableColumn<LoanScheduleInstallment>[] = [
    { key: 'installment_number', header: '#', render: (r) => r.installment_number, sortValue: (r) => r.installment_number },
    { key: 'due_date', header: 'Due Date', render: (r) => r.due_date, sortValue: (r) => r.due_date },
    { key: 'opening_principal', header: 'Opening Principal', align: 'right', render: (r) => formatCurrencyPrecise(r.opening_principal) },
    { key: 'principal_component', header: 'Principal', align: 'right', render: (r) => formatCurrencyPrecise(r.principal_component) },
    { key: 'interest_component', header: 'Interest', align: 'right', render: (r) => formatCurrencyPrecise(r.interest_component) },
    { key: 'tax_component', header: 'Tax/TDS', align: 'right', render: (r) => formatCurrencyPrecise(r.tax_component) },
    { key: 'total_installment_amount', header: 'Total', align: 'right', render: (r) => formatCurrencyPrecise(r.total_installment_amount) },
    { key: 'paid_amount', header: 'Paid', align: 'right', render: (r) => formatCurrencyPrecise(r.paid_amount) },
    { key: 'remaining_amount', header: 'Remaining', align: 'right', render: (r) => formatCurrencyPrecise(r.remaining_amount) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(canPay && onPay
      ? [
          {
            key: '__pay',
            header: '',
            hideable: false,
            align: 'right' as const,
            render: (r: LoanScheduleInstallment) =>
              r.status === 'paid' ? null : (
                <Button size="small" variant="outlined" onClick={() => onPay(r)}>
                  Record Payment
                </Button>
              ),
          },
        ]
      : []),
  ]

  return (
    <DataTable
      columns={columns}
      rows={installments}
      getRowId={(r) => r.id}
      emptyMessage="No repayment schedule generated"
    />
  )
}
