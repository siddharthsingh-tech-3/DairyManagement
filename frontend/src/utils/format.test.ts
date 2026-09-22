import { describe, expect, it } from 'vitest'
import { formatCompactCurrency, formatCurrency, formatCurrencyPrecise } from './format'

describe('formatCurrency', () => {
  it('formats whole rupee amounts with Indian grouping', () => {
    expect(formatCurrency(150000)).toBe('₹1,50,000')
  })

  it('accepts numeric strings', () => {
    expect(formatCurrency('2500')).toBe('₹2,500')
  })
})

describe('formatCurrencyPrecise', () => {
  it('always shows two decimal places', () => {
    expect(formatCurrencyPrecise(99.5)).toBe('₹99.50')
  })
})

describe('formatCompactCurrency', () => {
  it('compacts lakhs', () => {
    expect(formatCompactCurrency(131000)).toBe('₹1.3L')
  })

  it('compacts thousands', () => {
    expect(formatCompactCurrency(91500)).toBe('₹91.5k')
  })

  it('leaves small amounts uncompacted', () => {
    expect(formatCompactCurrency(500)).toBe('₹500')
  })
})
