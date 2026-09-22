// E-invoice generation has no live GSTN/IRP integration yet — records are simulated
// and kept client-side so the workflow (status, Ack No, download) still persists
// across visits until real GSP credentials are wired up.
export type EInvoiceTxnType = 'sales_invoice' | 'credit_note' | 'sales_return' | 'debit_note'

export type EInvoiceStatus = 'yet_to_be_pushed' | 'generated'

export interface EInvoicePartyDetails {
  gstin: string
  street: string
  state: string
  pincode: string
  city: string
}

export interface EInvoiceTransportDetails {
  transporterId: string
  transporterName: string
  approxDistanceKm: string
  modeOfTransportation: string
  vehicleNumber: string
  transporterDocNo: string
  transporterDocDate: string
  vehicleType: 'Regular' | 'Over Dimensional Cargo'
}

export interface EInvoiceRecord {
  status: EInvoiceStatus
  ackNumber?: string
  irn?: string
  generatedAt?: string
  withEwayBill: boolean
  ewayBillNumber?: string
  seller: EInvoicePartyDetails
  buyer: EInvoicePartyDetails
  supplyTypeCode: string
  transactionType: string
  transport?: EInvoiceTransportDetails
  hsnCodes: Record<string, string>
}

const RECORDS_KEY = 'e_invoicing:records:v1'
const SELLER_DEFAULTS_KEY = 'e_invoicing:seller_defaults:v1'

function recordKey(type: EInvoiceTxnType, id: string): string {
  return `${type}:${id}`
}

function readAllRecords(): Record<string, EInvoiceRecord> {
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, EInvoiceRecord>) : {}
  } catch {
    return {}
  }
}

function writeAllRecords(map: Record<string, EInvoiceRecord>) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(map))
}

export function getAllEInvoiceRecords(): Record<string, EInvoiceRecord> {
  return readAllRecords()
}

export function getEInvoiceRecord(type: EInvoiceTxnType, id: string): EInvoiceRecord | null {
  return readAllRecords()[recordKey(type, id)] ?? null
}

export function saveEInvoiceRecord(type: EInvoiceTxnType, id: string, record: EInvoiceRecord) {
  const all = readAllRecords()
  all[recordKey(type, id)] = record
  writeAllRecords(all)
  saveSellerDefaults(record.seller)
}

export function getSellerDefaults(): EInvoicePartyDetails | null {
  try {
    const raw = localStorage.getItem(SELLER_DEFAULTS_KEY)
    return raw ? (JSON.parse(raw) as EInvoicePartyDetails) : null
  } catch {
    return null
  }
}

export function saveSellerDefaults(seller: EInvoicePartyDetails) {
  localStorage.setItem(SELLER_DEFAULTS_KEY, JSON.stringify(seller))
}

function randomDigits(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 10)
  return out
}

export function generateMockAckNumber(): string {
  return randomDigits(15)
}

export function generateMockIrn(): string {
  const chars = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 64; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function generateMockEwayBillNumber(): string {
  return randomDigits(12)
}
