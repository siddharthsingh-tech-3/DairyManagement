import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type { Loan, LoanDetail, LoanLedgerEntryRecord, LoanRepaymentRecord, LoanScheduleInstallment } from '@/types/models'
import type {
  InterestCalculationMethod,
  LoanPartyType,
  LoanRecordStatus,
  LoanType,
  PaymentMethod,
  RepaymentFrequency,
} from '@/types/enums'

export interface LoanFilters {
  loan_type?: LoanType
  status?: LoanRecordStatus
  party_type?: LoanPartyType
  party_id?: string
  search?: string
}

export interface LoanCreatePayload {
  loan_type: LoanType
  party_type: LoanPartyType
  party_id?: string | null
  party_name?: string | null
  principal_amount: number
  loan_date: string
  disbursement_method: PaymentMethod
  interest_rate: number
  interest_type: InterestCalculationMethod
  tenure_months: number
  repayment_frequency: RepaymentFrequency
  first_repayment_date: string
  tax_type?: string | null
  tax_rate?: number | null
  notes?: string | null
}

export interface LoanUpdatePayload {
  notes?: string | null
  tax_type?: string | null
  tax_rate?: number | null
  status?: LoanRecordStatus
}

export interface LoanRepaymentPayload {
  installment_id?: string | null
  payment_date: string
  method: PaymentMethod
  principal_amount?: number
  interest_amount?: number
  tax_amount?: number
  tax_deduction_date?: string | null
  tax_reference?: string | null
  reference?: string | null
  notes?: string | null
}

export async function listLoans(filters: LoanFilters = {}): Promise<Loan[]> {
  const res = await apiClient.get<Envelope<Loan[]>>('/loans', { params: filters })
  return res.data.data
}

export async function getLoan(id: string): Promise<LoanDetail> {
  const res = await apiClient.get<Envelope<LoanDetail>>(`/loans/${id}`)
  return res.data.data
}

export async function createLoan(payload: LoanCreatePayload): Promise<LoanDetail> {
  const res = await apiClient.post<Envelope<LoanDetail>>('/loans', payload)
  return res.data.data
}

export async function updateLoan(id: string, payload: LoanUpdatePayload): Promise<Loan> {
  const res = await apiClient.patch<Envelope<Loan>>(`/loans/${id}`, payload)
  return res.data.data
}

export async function deleteLoan(id: string): Promise<void> {
  await apiClient.delete(`/loans/${id}`)
}

export async function cancelLoan(id: string): Promise<Loan> {
  const res = await apiClient.post<Envelope<Loan>>(`/loans/${id}/cancel`)
  return res.data.data
}

export async function getLoanSchedule(id: string): Promise<LoanScheduleInstallment[]> {
  const res = await apiClient.get<Envelope<LoanScheduleInstallment[]>>(`/loans/${id}/schedule`)
  return res.data.data
}

export async function recordLoanRepayment(id: string, payload: LoanRepaymentPayload): Promise<LoanRepaymentRecord> {
  const res = await apiClient.post<Envelope<LoanRepaymentRecord>>(`/loans/${id}/repayments`, payload)
  return res.data.data
}

export async function getLoanRepayments(id: string): Promise<LoanRepaymentRecord[]> {
  const res = await apiClient.get<Envelope<LoanRepaymentRecord[]>>(`/loans/${id}/repayments`)
  return res.data.data
}

export async function getLoanLedgerEntries(id: string): Promise<LoanLedgerEntryRecord[]> {
  const res = await apiClient.get<Envelope<LoanLedgerEntryRecord[]>>(`/loans/${id}/ledger-entries`)
  return res.data.data
}
