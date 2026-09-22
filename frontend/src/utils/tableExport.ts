import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type CellValue = string | number

function escapeHtml(value: CellValue): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function exportRowsToExcel(filename: string, sheetName: string, headers: string[], rows: CellValue[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}-${dayjs().format('YYYY-MM-DD')}.xlsx`)
}

export function exportRowsToPdf(filename: string, title: string, subtitle: string, headers: string[], rows: CellValue[][]) {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(14)
  doc.text(title, 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(subtitle, 14, 21)

  autoTable(doc, {
    startY: 27,
    head: [headers],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [63, 174, 125] },
  })

  doc.save(`${filename}-${dayjs().format('YYYY-MM-DD')}.pdf`)
}

export function printRows(title: string, subtitle: string, headers: string[], rows: CellValue[][]) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return

  const tableHead = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const tableBody = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  win.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Figtree, Arial, Helvetica, sans-serif; padding: 24px; color: #16241d; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          p { font-size: 12px; color: #6b8378; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #dfe9e3; padding: 6px 10px; font-size: 12px; text-align: left; }
          th { background: #3fae7d; color: #fff; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
        <table>
          <thead><tr>${tableHead}</tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
}
