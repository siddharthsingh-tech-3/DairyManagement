import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, Button, Card, CardContent, Grid2 as Grid, IconButton, LinearProgress, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import dayjs from 'dayjs'
import { getAuditLog, getOperationalReport } from '@/api/reports'
import { useToastStore } from '@/store/uiStore'
import { brand, monoFontFamily } from '@/theme/theme'

function toCsv(rows: { actor_name: string; action: string; created_at: string }[]): string {
  const header = 'Actor,Action,Time\n'
  const body = rows.map((r) => `"${r.actor_name}","${r.action.replace(/"/g, '""')}","${r.created_at}"`).join('\n')
  return header + body
}

export function DaybookStaffWiseReportPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const { data: operational } = useQuery({ queryKey: ['reports', 'operational'], queryFn: getOperationalReport })
  const { data: audit = [] } = useQuery({ queryKey: ['reports', 'audit-log'], queryFn: () => getAuditLog(50) })

  const handleExport = () => {
    const blob = new Blob([toCsv(audit)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daybook-staff-wise-${dayjs().format('YYYY-MM-DD')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast('Report exported to CSV')
  }

  const metrics = operational
    ? [
        { label: 'Delivery fulfilment', value: operational.delivery_fulfilment_percent, color: brand.positive },
        { label: 'Crate return rate', value: operational.crate_return_rate_percent, color: brand.mint },
        { label: 'Collection efficiency', value: operational.collection_efficiency_percent, color: brand.mint },
      ]
    : []

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate('/reports')}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Daybook - Staff Wise
            </Typography>
            <Typography color="text.secondary">Operational reports & immutable activity log by staff</Typography>
          </Box>
        </Stack>
        <Button variant="outlined" onClick={handleExport}>
          ⭳ Export CSV
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {metrics.map((m) => (
          <Grid key={m.label} size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" fontWeight={500} color="text.secondary">
                  {m.label}
                </Typography>
                <Typography variant="h5" fontWeight={500} fontFamily={monoFontFamily}>
                  {m.value}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Number(m.value)}
                  sx={{ mt: 1.5, height: 6, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: m.color } }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={600} sx={{ mb: 1.5 }}>
            Activity log
          </Typography>
          <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />} spacing={1.25}>
            {audit.map((entry) => (
              <Stack key={entry.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 1.25 }}>
                <Typography variant="body2">
                  <b>{entry.actor_name}</b> {entry.action}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontFamily="'JetBrains Mono',monospace">
                  {dayjs(entry.created_at).format('HH:mm')}
                </Typography>
              </Stack>
            ))}
            {audit.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No activity yet.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
