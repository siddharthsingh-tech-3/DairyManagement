import { useNavigate } from 'react-router-dom'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
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

export function NeedsAttentionCard({ data }: { data: AdminDashboard }) {
  const navigate = useNavigate()
  const count = data.vendors_over_limit + data.open_disputes + data.draft_orders

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography fontWeight={600} sx={{ mb: 1.5 }}>
          Needs attention
        </Typography>
        <Stack spacing={1}>
          {data.vendors_over_limit > 0 && (
            <AttentionRow
              color={brand.negative}
              text={`${data.vendors_over_limit} vendor(s) over their credit limit`}
              onClick={() => navigate('/vendors')}
            />
          )}
          {data.open_disputes > 0 && (
            <AttentionRow
              color={brand.warning}
              text={`${data.open_disputes} open crate dispute(s)`}
              onClick={() => navigate('/crates')}
            />
          )}
          {data.draft_orders > 0 && (
            <AttentionRow
              color={brand.mint}
              text={`${data.draft_orders} order(s) still in Draft`}
              onClick={() => navigate('/orders')}
            />
          )}
          {count === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nothing needs attention right now.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
