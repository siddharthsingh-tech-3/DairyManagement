import { Outlet } from 'react-router-dom'
import { Box, Paper, Stack, Typography } from '@mui/material'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import { GlobalToast } from '@/components/GlobalToast'
import { brand } from '@/theme/theme'

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper variant="outlined" sx={{ width: 420, maxWidth: '100%', p: 4, borderRadius: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LocalShippingIcon sx={{ color: brand.inkContrast }} />
          </Box>
          <Box>
            <Typography fontWeight={600} fontSize={17} lineHeight={1.1}>
              Kshirsagar Dairy
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              DISTRIBUTION SUITE
            </Typography>
          </Box>
        </Stack>
        <Outlet />
      </Paper>
      <GlobalToast />
    </Box>
  )
}
