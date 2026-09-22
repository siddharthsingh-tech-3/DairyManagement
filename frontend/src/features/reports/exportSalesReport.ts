import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrencyPrecise } from '@/utils/format'
import type { Invoice } from '@/types/models'

const COLUMNS = [
  'Date',
  'Invoice No.',
  'Party Name',
  'Due Date',
  'Amount',
  'Balance Amount',
  'Invoice Type',
  'Invoice Status',
  'Created By',
] as const

const STATUS_LABEL: Record<string, string> = { due: 'Unpaid', paid: 'Paid', partial: 'Partial', overdue: 'Overdue' }

function rowsFor(invoices: Invoice[]) {
  return invoices.map((inv) => ({
    date: dayjs(inv.created_at).format('DD/MM/YYYY'),
    invoiceNo: inv.invoice_no,
    partyName: inv.vendor_name,
    dueDate: dayjs(inv.due_date).format('DD/MM/YYYY'),
    amount: Number(inv.total),
    balance: Number(inv.total) - Number(inv.amount_paid),
    invoiceType: inv.invoice_type,
    status: STATUS_LABEL[inv.status] ?? inv.status,
    createdBy: inv.created_by ?? '—',
  }))
}

export function exportSalesReportToExcel(invoices: Invoice[], totalSales: number) {
  const rows = rowsFor(invoices)
  const sheetRows: Record<(typeof COLUMNS)[number], string | number>[] = rows.map((r) => ({
    Date: r.date,
    'Invoice No.': r.invoiceNo,
    'Party Name': r.partyName,
    'Due Date': r.dueDate,
    Amount: r.amount,
    'Balance Amount': r.balance,
    'Invoice Type': r.invoiceType,
    'Invoice Status': r.status,
    'Created By': r.createdBy,
  }))
  sheetRows.push({
    Date: '',
    'Invoice No.': '',
    'Party Name': 'Total Sales',
    'Due Date': '',
    Amount: totalSales,
    'Balance Amount': '',
    'Invoice Type': '',
    'Invoice Status': '',
    'Created By': '',
  })
  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: [...COLUMNS] })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report')
  XLSX.writeFile(workbook, `sales-transaction-report-${dayjs().format('YYYY-MM-DD')}.xlsx`)
}

export function exportSalesReportToPdf(invoices: Invoice[], totalSales: number) {
  const rows = rowsFor(invoices)
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text('Sales Transaction Report', 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text('A summary of all sales transactions within the selected date range.', 14, 21)

  autoTable(doc, {
    startY: 27,
    head: [[...COLUMNS]],
    body: rows.map((r) => [
      r.date,
      r.invoiceNo,
      r.partyName,
      r.dueDate,
      formatCurrencyPrecise(r.amount),
      formatCurrencyPrecise(r.balance),
      r.invoiceType,
      r.status,
      r.createdBy,
    ]),
    foot: [['', '', 'Total Sales', '', formatCurrencyPrecise(totalSales), '', '', '', '']],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [63, 174, 125] },
    footStyles: { fillColor: [238, 241, 245], textColor: [20, 20, 20], fontStyle: 'bold' },
  })

  doc.save(`sales-transaction-report-${dayjs().format('YYYY-MM-DD')}.pdf`)
}
