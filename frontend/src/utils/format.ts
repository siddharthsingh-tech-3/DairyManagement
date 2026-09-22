export function formatCurrency(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export function formatCurrencyPrecise(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCompactCurrency(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'k'
  return formatCurrency(n)
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
}

function threeDigitsToWords(n: number): string {
  if (n >= 100) return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigitsToWords(n % 100) : '')
  return twoDigitsToWords(n)
}

/** Indian numbering (Crore/Lakh/Thousand) amount-in-words, as used on GST invoices. */
export function amountToWordsIndian(value: string | number): string {
  const n = Math.round(Math.abs(typeof value === 'string' ? Number(value) : value))
  if (n === 0) return 'Zero Rupees Only'

  let remaining = n
  const crore = Math.floor(remaining / 10000000)
  remaining %= 10000000
  const lakh = Math.floor(remaining / 100000)
  remaining %= 100000
  const thousand = Math.floor(remaining / 1000)
  remaining %= 1000
  const hundred = remaining

  const parts: string[] = []
  if (crore) parts.push(threeDigitsToWords(crore) + ' Crore')
  if (lakh) parts.push(threeDigitsToWords(lakh) + ' Lakh')
  if (thousand) parts.push(threeDigitsToWords(thousand) + ' Thousand')
  if (hundred) parts.push(threeDigitsToWords(hundred))

  return parts.join(' ') + ' Rupees Only'
}
