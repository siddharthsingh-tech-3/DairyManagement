import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency } from '@/utils/format'
import type { EInvoiceRecord } from './eInvoiceStorage'
import type { EInvoiceTransaction } from './useEInvoiceTransactions'

export function downloadEInvoicePdf(txn: EInvoiceTransaction, record: EInvoiceRecord) {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('e-Invoice', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90)
  doc.text(`${txn.typeLabel} · ${txn.number} · ${dayjs(txn.date).format('DD/MM/YYYY')}`, 14, 22)
  doc.setTextColor(0)

  let y = 32
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Ack No.', 14, y)
  doc.text('IRN', 14, y + 10)
  if (record.withEwayBill) doc.text('e-Way Bill No.', 14, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.text(record.ackNumber ?? '-', 45, y)
  doc.text(record.irn ?? '-', 45, y + 10, { maxWidth: 150 })
  if (record.withEwayBill) doc.text(record.ewayBillNumber ?? '-', 45, y + 20)

  y += record.withEwayBill ? 32 : 22

  doc.setFont('helvetica', 'bold')
  doc.text('Seller', 14, y)
  doc.text('Buyer', 110, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const sellerLines = [
    record.seller.gstin && `GSTIN: ${record.seller.gstin}`,
    record.seller.street,
    [record.seller.city, record.seller.state, record.seller.pincode].filter(Boolean).join(', '),
  ].filter(Boolean) as string[]
  const buyerLines = [
    txn.partyName,
    record.buyer.gstin && `GSTIN: ${record.buyer.gstin}`,
    record.buyer.street,
    [record.buyer.city, record.buyer.state, record.buyer.pincode].filter(Boolean).join(', '),
  ].filter(Boolean) as string[]
  sellerLines.forEach((line, idx) => doc.text(line, 14, y + idx * 5, { maxWidth: 90 }))
  buyerLines.forEach((line, idx) => doc.text(line, 110, y + idx * 5, { maxWidth: 90 }))

  y += Math.max(sellerLines.length, buyerLines.length) * 5 + 8

  autoTable(doc, {
    startY: y,
    head: [['Item', 'HSN Code']],
    body: txn.items.map((item) => [item.description, record.hsnCodes[item.description] ?? item.hsnCode]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [63, 174, 125] },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 8

  doc.setFont('helvetica', 'bold')
  doc.text(`Total Amount: ${formatCurrency(txn.totalAmount)}`, 14, finalY)

  if (record.withEwayBill && record.transport) {
    finalY += 10
    doc.setFont('helvetica', 'bold')
    doc.text('Transportation Details', 14, finalY)
    finalY += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const t = record.transport
    const lines = [
      t.transporterName && `Transporter: ${t.transporterName}${t.transporterId ? ` (${t.transporterId})` : ''}`,
      `Mode: ${t.modeOfTransportation} · Distance: ${t.approxDistanceKm} km`,
      t.vehicleNumber && `Vehicle: ${t.vehicleNumber} (${t.vehicleType})`,
    ].filter(Boolean) as string[]
    lines.forEach((line, idx) => doc.text(line, 14, finalY + idx * 5))
  }

  doc.save(`e-invoice-${txn.number}.pdf`)
}
