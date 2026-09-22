import { useParams, useNavigate } from 'react-router-dom'
import { Box, Card, CardContent, IconButton, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import { findReportBySlug } from '@/constants/reportsCatalog'

export function ReportPlaceholderPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const report = findReportBySlug(slug)

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton size="small" onClick={() => navigate('/reports')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={600}>
          {report?.label ?? 'Report'}
        </Typography>
      </Stack>

      <Card variant="outlined">
        <CardContent sx={{ py: 8 }}>
          <Stack spacing={1.5} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
              }}
            >
              <ConstructionOutlinedIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
            </Box>
            <Typography fontWeight={500}>This report is coming soon</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
              {report?.label ?? 'This report'} is not yet available. Check back soon or contact support if you need
              it urgently.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
