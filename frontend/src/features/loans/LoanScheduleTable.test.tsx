import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoanScheduleTable } from './LoanScheduleTable'
import type { LoanScheduleInstallment } from '@/types/models'

const installments: LoanScheduleInstallment[] = [
  {
    id: '1',
    installment_number: 1,
    due_date: '2026-02-01',
    opening_principal: '12000.00',
    principal_component: '1000.00',
    interest_component: '120.00',
    tax_component: '0.00',
    total_installment_amount: '1120.00',
    paid_amount: '1120.00',
    remaining_amount: '0.00',
    status: 'paid',
  },
  {
    id: '2',
    installment_number: 2,
    due_date: '2026-03-01',
    opening_principal: '11000.00',
    principal_component: '1000.00',
    interest_component: '110.00',
    tax_component: '0.00',
    total_installment_amount: '1110.00',
    paid_amount: '0.00',
    remaining_amount: '1110.00',
    status: 'upcoming',
  },
]

describe('LoanScheduleTable', () => {
  it('renders one row per installment with its status', () => {
    render(<LoanScheduleTable installments={installments} canPay={false} />)
    expect(screen.getByText('2026-02-01')).toBeInTheDocument()
    expect(screen.getByText('2026-03-01')).toBeInTheDocument()
    expect(screen.getByText('paid')).toBeInTheDocument()
    expect(screen.getByText('upcoming')).toBeInTheDocument()
  })

  it('shows a Record Payment action only for unpaid installments when canPay is true', () => {
    render(<LoanScheduleTable installments={installments} canPay onPay={() => {}} />)
    const buttons = screen.getAllByRole('button', { name: 'Record Payment' })
    expect(buttons).toHaveLength(1)
  })

  it('invokes onPay with the clicked installment', async () => {
    const user = userEvent.setup()
    const onPay = vi.fn()
    render(<LoanScheduleTable installments={installments} canPay onPay={onPay} />)
    await user.click(screen.getByRole('button', { name: 'Record Payment' }))
    expect(onPay).toHaveBeenCalledWith(installments[1])
  })

  it('hides the payment action entirely when canPay is false', () => {
    render(<LoanScheduleTable installments={installments} canPay={false} />)
    expect(screen.queryByRole('button', { name: 'Record Payment' })).not.toBeInTheDocument()
  })

  it('shows the empty message when there is no schedule', () => {
    render(<LoanScheduleTable installments={[]} canPay={false} />)
    expect(screen.getByText('No repayment schedule generated')).toBeInTheDocument()
  })
})
