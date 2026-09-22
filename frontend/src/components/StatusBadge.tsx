import { Chip } from '@mui/material'
import { brand } from '@/theme/theme'

const NEUTRAL = { bg: brand.borderInner, fg: brand.textSecondary }
const ACTIVE = { bg: '#eaf6f0', fg: '#2c7e5a' }

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  // active / in-progress — mint family, the brand accent
  scheduled: ACTIVE,
  dispatched: ACTIVE,
  recurring: ACTIVE,
  ordered: ACTIVE,
  sale: ACTIVE,
  // positive / success
  delivered: { bg: brand.positiveBg, fg: brand.positive },
  confirmed: { bg: brand.positiveBg, fg: brand.positive },
  paid: { bg: brand.positiveBg, fg: brand.positive },
  resolved: { bg: brand.positiveBg, fg: brand.positive },
  return: { bg: brand.positiveBg, fg: brand.positive },
  received: { bg: brand.positiveBg, fg: brand.positive },
  completed: { bg: brand.positiveBg, fg: brand.positive },
  generated: { bg: brand.positiveBg, fg: brand.positive },
  closed: { bg: brand.positiveBg, fg: brand.positive },
  active: ACTIVE,
  // warning / needs attention
  locked: { bg: brand.warningBg, fg: brand.warning },
  partial: { bg: brand.warningBg, fg: brand.warning },
  partially_paid: { bg: brand.warningBg, fg: brand.warning },
  open: { bg: brand.warningBg, fg: brand.warning },
  adjustment: { bg: brand.warningBg, fg: brand.warning },
  due: { bg: brand.warningBg, fg: brand.warning },
  // negative
  cancelled: { bg: brand.negativeBg, fg: brand.negative },
  overdue: { bg: brand.negativeBg, fg: brand.negative },
  damage: { bg: brand.negativeBg, fg: brand.negative },
  unpaid: { bg: brand.negativeBg, fg: brand.negative },
  issue: { bg: brand.negativeBg, fg: brand.negative },
  defaulted: { bg: brand.negativeBg, fg: brand.negative },
  // neutral
  draft: NEUTRAL,
  pending: NEUTRAL,
  normal: NEUTRAL,
  purchase: NEUTRAL,
  upcoming: NEUTRAL,
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colors = STATUS_COLORS[status.toLowerCase()] ?? NEUTRAL
  return (
    <Chip
      label={label ?? status.replace(/_/g, ' ')}
      size="small"
      sx={{
        bgcolor: colors.bg,
        color: colors.fg,
        fontWeight: 600,
        textTransform: 'capitalize',
        fontSize: 12,
        borderRadius: '5px',
      }}
    />
  )
}
