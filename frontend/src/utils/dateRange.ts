import dayjs, { type Dayjs } from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

dayjs.extend(quarterOfYear)

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_365_days'
  | 'all_time'
  | 'custom'

export interface DateRangeValue {
  preset: DatePreset
  start: Dayjs | null
  end: Dayjs | null
}

export const ALL_TIME_RANGE: DateRangeValue = { preset: 'all_time', start: null, end: null }

export function isWithinDateRange(date: string, range: DateRangeValue): boolean {
  if (range.preset === 'all_time' || !range.start || !range.end) return true
  const d = dayjs(date)
  return !d.isBefore(range.start, 'day') && !d.isAfter(range.end, 'day')
}

export function presetRange(preset: DatePreset): { start: Dayjs | null; end: Dayjs | null } {
  const now = dayjs()
  switch (preset) {
    case 'today':
      return { start: now.startOf('day'), end: now.endOf('day') }
    case 'yesterday': {
      const y = now.subtract(1, 'day')
      return { start: y.startOf('day'), end: y.endOf('day') }
    }
    case 'this_week':
      return { start: now.startOf('week'), end: now.endOf('week') }
    case 'this_month':
      return { start: now.startOf('month'), end: now.endOf('month') }
    case 'last_month': {
      const m = now.subtract(1, 'month')
      return { start: m.startOf('month'), end: m.endOf('month') }
    }
    case 'this_quarter':
      return { start: now.startOf('quarter'), end: now.endOf('quarter') }
    case 'last_365_days':
      return { start: now.subtract(365, 'day').startOf('day'), end: now.endOf('day') }
    default:
      return { start: null, end: null }
  }
}
