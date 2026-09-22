import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { monoFontFamily } from '@/theme/theme'

interface KpiCardProps {
  label: string
  value: string
  hint: string
  icon: ReactNode
  color: string
  onClick?: () => void
}

export function KpiCard({ label, value, hint, icon, color, onClick }: KpiCardProps) {
  const content = (
    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="caption" fontWeight={500} color="text.secondary">
          {label}
        </Typography>
        <Stack sx={{ color, flexShrink: 0 }} alignItems="center" justifyContent="center">
          {icon}
        </Stack>
      </Stack>
      <Typography sx={{ mt: 1, fontSize: 24, fontWeight: 500, fontFamily: monoFontFamily }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    </CardContent>
  )

  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', borderTop: '3px solid', borderTopColor: color }}
    >
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}
