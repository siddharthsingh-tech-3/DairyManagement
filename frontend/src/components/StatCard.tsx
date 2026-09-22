import { Card, CardContent, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { monoFontFamily } from '@/theme/theme'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  hintColor?: string
  icon?: ReactNode
  accentColor?: string
  /** 3px top border colour — mint for operational metrics, amber for anything needing attention. */
  topBorderColor?: string
  highlighted?: boolean
  onClick?: () => void
  selected?: boolean
}

export function StatCard({
  label,
  value,
  hint,
  hintColor,
  icon,
  accentColor,
  topBorderColor,
  highlighted,
  onClick,
  selected,
}: StatCardProps) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        height: '100%',
        ...(topBorderColor && { borderTop: '3px solid', borderTopColor: topBorderColor }),
        ...((highlighted || selected) && { borderColor: accentColor ?? 'primary.main', borderWidth: 2 }),
        ...(onClick && {
          cursor: 'pointer',
          transition: 'border-color 0.15s, transform 0.15s',
          '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
        }),
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {icon && (
              <Stack sx={{ color: accentColor ?? 'text.secondary' }} alignItems="center" justifyContent="center">
                {icon}
              </Stack>
            )}
            <Typography variant="caption" fontWeight={500} color="text.secondary">
              {label}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 24, fontWeight: 500, fontFamily: monoFontFamily, letterSpacing: -0.3 }}>{value}</Typography>
          {hint && (
            <Typography variant="caption" fontWeight={500} sx={{ color: hintColor ?? 'text.secondary' }}>
              {hint}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
