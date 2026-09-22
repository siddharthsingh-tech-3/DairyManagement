import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { presetRange } from './dateRange'

describe('presetRange', () => {
  it('this_week returns the current week boundaries', () => {
    const { start, end } = presetRange('this_week')
    expect(start!.isSame(dayjs().startOf('week'), 'minute')).toBe(true)
    expect(end!.isSame(dayjs().endOf('week'), 'minute')).toBe(true)
  })

  it('this_quarter returns the current quarter boundaries', () => {
    const { start, end } = presetRange('this_quarter')
    expect(start!.isSame(dayjs().startOf('quarter'), 'minute')).toBe(true)
    expect(end!.isSame(dayjs().endOf('quarter'), 'minute')).toBe(true)
    expect(end!.diff(start!, 'day')).toBeLessThan(93)
  })
})
