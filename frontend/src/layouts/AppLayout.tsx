import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Drawer,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ApartmentIcon from '@mui/icons-material/ApartmentOutlined'
import { NAV_CATEGORIES, NAV_ITEMS, type NavItem } from '@/constants/nav'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { useCanViewFeature } from '@/hooks/usePermissions'
import { GlobalToast } from '@/components/GlobalToast'
import { NotificationBell } from '@/components/NotificationBell'
import { brand } from '@/theme/theme'

const DRAWER_WIDTH = 250

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Admin',
  vendor: 'Vendor',
  driver: 'Truck Owner',
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const canView = useCanViewFeature()

  const groups = NAV_CATEGORIES.map((category) => ({
    category,
    items: NAV_ITEMS.filter((item) => item.category === category && canView(item.feature)),
  })).filter((group) => group.items.length > 0)

  return (
    <Stack spacing={2} sx={{ px: 1.5, py: 2 }}>
      {groups.map((group) => (
        <Stack key={group.category} spacing={0.5}>
          <Typography
            variant="caption"
            fontWeight={500}
            sx={{ px: 1.5, pb: 1, color: brand.sidebarLabel, letterSpacing: '.06em', textTransform: 'uppercase', fontSize: 10 }}
          >
            {group.category}
          </Typography>
          {group.items.map((item) => (
            <NavRow key={item.path} item={item} onNavigate={onNavigate} />
          ))}
        </Stack>
      ))}
    </Stack>
  )
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { path, label, roleLabels, icon: Icon, children } = item
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const childMatch =
    location.pathname === path || (children?.some((c) => location.pathname.startsWith(c.path)) ?? false)
  const [open, setOpen] = useState(childMatch)
  useEffect(() => {
    if (childMatch) setOpen(true)
  }, [childMatch])

  const resolvedLabel = (user && roleLabels?.[user.role]) || label

  const itemSx = {
    borderRadius: '8px',
    color: brand.sidebarText,
    '& .MuiListItemIcon-root': { color: brand.sidebarIcon },
    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
    '&.active': {
      bgcolor: brand.sidebarActiveBg,
      color: brand.sidebarActiveText,
      '& .MuiListItemIcon-root': { color: 'inherit' },
    },
  } as const

  if (children && children.length > 0) {
    return (
      <>
        <ListItemButton
          component={NavLink}
          to={path}
          end
          onClick={() => {
            setOpen(true)
            onNavigate?.()
          }}
          sx={{
            ...itemSx,
            ...(childMatch && { bgcolor: 'rgba(255,255,255,0.05)' }),
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Icon fontSize="small" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}>{resolvedLabel}</ListItemText>
          <IconButton
            size="small"
            component="span"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen((o) => !o)
            }}
            sx={{ color: 'inherit' }}
          >
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Stack spacing={0.5} sx={{ pl: 3, pt: 0.5, pb: 0.5 }}>
            {children.map((child) => (
              <ListItemButton key={child.path} component={NavLink} to={child.path} onClick={onNavigate} sx={{ ...itemSx, py: 0.5 }}>
                <ListItemText primaryTypographyProps={{ fontWeight: 500, fontSize: 13 }}>{child.label}</ListItemText>
              </ListItemButton>
            ))}
          </Stack>
        </Collapse>
      </>
    )
  }

  return (
    <ListItemButton component={NavLink} to={path} onClick={onNavigate} sx={itemSx}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}>{resolvedLabel}</ListItemText>
    </ListItemButton>
  )
}

export function AppLayout() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()

  const initials = user?.full_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const drawer = <NavList onNavigate={() => setMobileOpen(false)} />

  const logo = (
    <Stack direction="row" alignItems="center" spacing={1.25}>
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
        <LocalShippingIcon sx={{ color: brand.inkContrast, fontSize: 18 }} />
      </Box>
      <Box>
        <Typography fontWeight={600} fontSize={15} lineHeight={1.1} sx={{ color: 'inherit' }}>
          Kshirsagar Dairy
        </Typography>
        <Typography variant="caption" fontWeight={500} sx={{ letterSpacing: '.04em', color: brand.sidebarLabel }}>
          DISTRIBUTION SUITE
        </Typography>
      </Box>
    </Stack>
  )

  const sidebarHeader = (
    <Toolbar sx={{ px: 2 }}>
      <Box sx={{ color: '#ffffff' }}>{logo}</Box>
    </Toolbar>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {isMobile && (
            <>
              <IconButton edge="start" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
              {logo}
            </>
          )}
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <NotificationBell />
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography fontSize={13} fontWeight={600}>
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {user ? ROLE_LABELS[user.role] : ''}
                {user?.tenant_name ? ` · ${user.tenant_name}` : ''}
              </Typography>
            </Box>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: brand.inkContrast, fontSize: 13, fontWeight: 600 }}>
                {initials}
              </Avatar>
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
              {user?.is_platform_admin && (
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null)
                    navigate('/platform/tenants')
                  }}
                >
                  <ListItemIcon>
                    <ApartmentIcon fontSize="small" />
                  </ListItemIcon>
                  Platform Admin
                </MenuItem>
              )}
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null)
                  logout.mutate()
                }}
              >
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      {isMobile ? (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: brand.sidebarBg,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Toolbar sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, overflowY: 'auto' }}>{drawer}</Box>
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              bgcolor: brand.sidebarBg,
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Box sx={{ flexShrink: 0 }}>{sidebarHeader}</Box>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>{drawer}</Box>
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.default' }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
      <GlobalToast />
    </Box>
  )
}
