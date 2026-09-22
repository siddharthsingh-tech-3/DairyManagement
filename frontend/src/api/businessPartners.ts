import { apiClient } from './client'
import type { Envelope } from '@/types/api'
import type {
  BusinessPartner,
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
import type {
  CapitalContributionType,
  InterestCalculationMethod,
  InterestPaymentStatus,
  LiabilityStatus,
  LoanStatus,
  PartnerStatus,
  RemunerationFrequency,
  RemunerationType,
} from '@/types/enums'

export interface PartnerBankAccountPayload {
  account_number: string
  account_holder_name?: string | null
  bank_name?: string | null
  ifsc_code?: string | null
  branch_name?: string | null
  is_primary?: boolean
}

export interface BusinessPartnerPayload {
  name: string
  address: string
  phone?: string | null
  email?: string | null
  tin?: string | null
  pan_number?: string | null
  gstin?: string | null
  other_tax_details?: string | null
  opening_capital_balance?: number
  opening_balance_date?: string | null
  /** At least one account is required when creating a partner. */
  bank_accounts: PartnerBankAccountPayload[]
}

export async function listBusinessPartners(search?: string, status?: PartnerStatus): Promise<BusinessPartner[]> {
  const res = await apiClient.get<Envelope<BusinessPartner[]>>('/business-partners', { params: { search, status } })
  return res.data.data
}

export async function getBusinessPartner(id: string): Promise<BusinessPartnerDetail> {
  const res = await apiClient.get<Envelope<BusinessPartnerDetail>>(`/business-partners/${id}`)
  return res.data.data
}

export async function createBusinessPartner(payload: BusinessPartnerPayload): Promise<BusinessPartner> {
  const res = await apiClient.post<Envelope<BusinessPartner>>('/business-partners', payload)
  return res.data.data
}

export async function updateBusinessPartner(
  id: string,
  payload: Partial<BusinessPartnerPayload & { status: PartnerStatus }>,
): Promise<BusinessPartner> {
  const res = await apiClient.patch<Envelope<BusinessPartner>>(`/business-partners/${id}`, payload)
  return res.data.data
}

// --- Bank accounts ---

export async function addPartnerBankAccount(partnerId: string, payload: PartnerBankAccountPayload): Promise<PartnerBankAccount> {
  const res = await apiClient.post<Envelope<PartnerBankAccount>>(`/business-partners/${partnerId}/bank-accounts`, payload)
  return res.data.data
}

export async function setPrimaryPartnerBankAccount(partnerId: string, rowId: string): Promise<PartnerBankAccount> {
  const res = await apiClient.patch<Envelope<PartnerBankAccount>>(`/business-partners/${partnerId}/bank-accounts/${rowId}/primary`)
  return res.data.data
}

export async function deletePartnerBankAccount(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/bank-accounts/${rowId}`)
}

// --- Capital contributions ---

export interface CapitalContributionPayload {
  contribution_type: CapitalContributionType
  amount: number
  contribution_date: string
  note?: string | null
  interest_rate?: number | null
  interest_amount?: number | null
  interest_calculation_method?: InterestCalculationMethod | null
  interest_effective_date?: string | null
}

export async function addCapitalContribution(partnerId: string, payload: CapitalContributionPayload): Promise<PartnerCapitalContribution> {
  const res = await apiClient.post<Envelope<PartnerCapitalContribution>>(`/business-partners/${partnerId}/capital-contributions`, payload)
  return res.data.data
}

export async function deleteCapitalContribution(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/capital-contributions/${rowId}`)
}

// --- Profit & loss ratios ---

export interface ProfitLossRatioPayload {
  profit_percentage: number
  loss_percentage: number
  effective_date: string
  note?: string | null
}

export async function addProfitLossRatio(partnerId: string, payload: ProfitLossRatioPayload): Promise<PartnerProfitLossRatio> {
  const res = await apiClient.post<Envelope<PartnerProfitLossRatio>>(`/business-partners/${partnerId}/profit-loss-ratios`, payload)
  return res.data.data
}

export async function deleteProfitLossRatio(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/profit-loss-ratios/${rowId}`)
}

// --- Drawings ---

export interface DrawingPayload {
  amount: number
  drawing_date: string
  description?: string | null
}

export async function addDrawing(partnerId: string, payload: DrawingPayload): Promise<PartnerDrawing> {
  const res = await apiClient.post<Envelope<PartnerDrawing>>(`/business-partners/${partnerId}/drawings`, payload)
  return res.data.data
}

export async function deleteDrawing(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/drawings/${rowId}`)
}

// --- Profit & loss allocations ---

export interface ProfitLossAllocationPayload {
  amount: number
  allocation_date: string
  period_label?: string | null
  note?: string | null
}

export async function addProfitLossAllocation(partnerId: string, payload: ProfitLossAllocationPayload): Promise<PartnerProfitLossAllocation> {
  const res = await apiClient.post<Envelope<PartnerProfitLossAllocation>>(`/business-partners/${partnerId}/profit-loss-allocations`, payload)
  return res.data.data
}

export async function deleteProfitLossAllocation(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/profit-loss-allocations/${rowId}`)
}

// --- Remuneration ---

export interface RemunerationPayload {
  remuneration_type: RemunerationType
  amount: number
  frequency: RemunerationFrequency
  effective_date: string
  description?: string | null
}

export async function addRemuneration(partnerId: string, payload: RemunerationPayload): Promise<PartnerRemuneration> {
  const res = await apiClient.post<Envelope<PartnerRemuneration>>(`/business-partners/${partnerId}/remunerations`, payload)
  return res.data.data
}

export async function deleteRemuneration(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/remunerations/${rowId}`)
}

// --- Interest on capital ---

export interface CapitalInterestPayload {
  interest_rate: number
  calculation_method: InterestCalculationMethod
  effective_date: string
  interest_amount: number
  payment_status?: InterestPaymentStatus
}

export async function addCapitalInterest(partnerId: string, payload: CapitalInterestPayload): Promise<PartnerCapitalInterest> {
  const res = await apiClient.post<Envelope<PartnerCapitalInterest>>(`/business-partners/${partnerId}/capital-interest`, payload)
  return res.data.data
}

export async function updateCapitalInterest(
  partnerId: string,
  rowId: string,
  payload: { payment_status: InterestPaymentStatus },
): Promise<PartnerCapitalInterest> {
  const res = await apiClient.patch<Envelope<PartnerCapitalInterest>>(`/business-partners/${partnerId}/capital-interest/${rowId}`, payload)
  return res.data.data
}

export async function deleteCapitalInterest(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/capital-interest/${rowId}`)
}

// --- Loans from partners ---

export interface LoanPayload {
  loan_amount: number
  loan_date: string
  interest_rate?: number | null
  repayment_terms?: string | null
  loan_status?: LoanStatus
}

export async function addLoan(partnerId: string, payload: LoanPayload): Promise<PartnerLoan> {
  const res = await apiClient.post<Envelope<PartnerLoan>>(`/business-partners/${partnerId}/loans`, payload)
  return res.data.data
}

export async function updateLoan(
  partnerId: string,
  rowId: string,
  payload: { outstanding_balance?: number; loan_status?: LoanStatus },
): Promise<PartnerLoan> {
  const res = await apiClient.patch<Envelope<PartnerLoan>>(`/business-partners/${partnerId}/loans/${rowId}`, payload)
  return res.data.data
}

export async function deleteLoan(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/loans/${rowId}`)
}

// --- Joint liabilities ---

export interface JointLiabilityPayload {
  liability_type: string
  description?: string | null
  total_liability_amount: number
  share_percentage: number
  outstanding_amount: number
  due_date?: string | null
  status?: LiabilityStatus
}

export async function addJointLiability(partnerId: string, payload: JointLiabilityPayload): Promise<PartnerJointLiability> {
  const res = await apiClient.post<Envelope<PartnerJointLiability>>(`/business-partners/${partnerId}/liabilities`, payload)
  return res.data.data
}

export async function updateJointLiability(
  partnerId: string,
  rowId: string,
  payload: { outstanding_amount?: number; status?: LiabilityStatus },
): Promise<PartnerJointLiability> {
  const res = await apiClient.patch<Envelope<PartnerJointLiability>>(`/business-partners/${partnerId}/liabilities/${rowId}`, payload)
  return res.data.data
}

export async function deleteJointLiability(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/liabilities/${rowId}`)
}

// --- Operational responsibilities ---

export interface ResponsibilityPayload {
  role_title: string
  description?: string | null
  financial_decision_authority?: boolean
  approval_authority?: boolean
  effective_date: string
  notes?: string | null
}

export async function addResponsibility(partnerId: string, payload: ResponsibilityPayload): Promise<PartnerResponsibility> {
  const res = await apiClient.post<Envelope<PartnerResponsibility>>(`/business-partners/${partnerId}/responsibilities`, payload)
  return res.data.data
}

export async function deleteResponsibility(partnerId: string, rowId: string): Promise<void> {
  await apiClient.delete(`/business-partners/${partnerId}/responsibilities/${rowId}`)
}
