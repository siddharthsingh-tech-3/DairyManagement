import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge, Box, IconButton, Menu, Stack, Typography } from '@mui/material'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import { getDashboard } from '@/api/reports'
import { useAuthStore } from '@/store/authStore'
import { brand } from '@/theme/theme'
import type { AdminDashboard } from '@/types/models'

function AttentionRow({ color, text, onClick }: { color: string; text: string; onClick: () => void }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      onClick={onClick}
      sx={{
        p: 1.25,
        mx: 1,
        my: 0.5,
        borderRadius: 2,
        bgcolor: `${color}14`,
        cursor: 'pointer',
        '&:hover': { bgcolor: `${color}26` },
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      <Typography variant="body2" fontWeight={500} sx={{ color }}>
        {text}
      </Typography>
    </Stack>
  )
}

export function NotificationBell() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard<AdminDashboard>(),
    enabled: user?.role === 'super_admin',
    refetchInterval: 60 * 1000,
  })

  if (user?.role !== 'super_admin') return null

  const count = data ? data.vendors_over_limit + data.open_disputes + data.draft_orders : 0

  const goTo = (path: string) => {
    setAnchor(null)
    navigate(path)
  }

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
        <Badge badgeContent={count} color="error">
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 320 } } }}
      >
        <Typography fontWeight={600} sx={{ px: 2, pt: 1, pb: 0.5 }}>
          Needs attention
        </Typography>
        {data && data.vendors_over_limit > 0 && (
          <AttentionRow
            color={brand.negative}
            text={`${data.vendors_over_limit} vendor(s) over their credit limit`}
            onClick={() => goTo('/vendors')}
          />
        )}
        {data && data.open_disputes > 0 && (
          <AttentionRow
            color={brand.warning}
            text={`${data.open_disputes} open crate dispute(s)`}
            onClick={() => goTo('/crates')}
          />
        )}
        {data && data.draft_orders > 0 && (
          <AttentionRow
            color={brand.mint}
            text={`${data.draft_orders} order(s) still in Draft`}
            onClick={() => goTo('/orders')}
          />
        )}
        {count === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
            Nothing needs attention right now.
          </Typography>
        )}
      </Menu>
    </>
  )
}
