import { Outlet, useNavigate } from 'react-router-dom'
import { AppBar, Avatar, Box, Button, IconButton, Stack, Toolbar, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LogoutIcon from '@mui/icons-material/Logout'
import ApartmentIcon from '@mui/icons-material/ApartmentOutlined'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { GlobalToast } from '@/components/GlobalToast'
import { brand } from '@/theme/theme'

/**
 * Deliberately separate from AppLayout: platform administration (managing
 * tenants) isn't part of any one tenant's business app, so it gets its own
 * shell rather than a nav item bolted onto the regular business sidebar.
 */
export function PlatformLayout() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const logout = useLogout()

  const initials = user?.full_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ApartmentIcon sx={{ color: brand.inkContrast, fontSize: 18 }} />
          </Box>
          <Box>
            <Typography fontWeight={600} fontSize={15} lineHeight={1.1}>
              Platform Admin
            </Typography>
            <Typography variant="caption" fontWeight={500} sx={{ letterSpacing: '.04em', color: 'text.secondary' }}>
              TENANT MANAGEMENT
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Button startIcon={<ArrowBackIcon />} color="inherit" onClick={() => navigate('/dashboard')}>
            Back to my dashboard
          </Button>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography fontSize={13} fontWeight={600}>
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Platform admin
              </Typography>
            </Box>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: brand.inkContrast, fontSize: 13, fontWeight: 600 }}>
              {initials}
            </Avatar>
            <IconButton onClick={() => logout.mutate()} title="Logout">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
        <Outlet />
      </Box>
      <GlobalToast />
    </Box>
  )
}
