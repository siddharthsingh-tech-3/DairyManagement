import { createTheme } from '@mui/material/styles'

/**
 * Fresh Mint design tokens. Mint is the only brand accent — amber and red
 * exist purely as status colours, never as a second accent.
 */
export const brand = {
  canvas: '#f2f7f4',
  surface: '#ffffff',
  mint: '#3fae7d',
  ink: '#12352a',
  inkContrast: '#06231a',
  textPrimary: '#16241d',
  textSecondary: '#6b8378',
  textMuted: '#8ba398',
  borderCard: '#dfe9e3',
  borderInner: '#ecf2ef',
  borderRow: '#f3f7f5',
  secondaryButtonBorder: '#cddcd4',
  secondaryButtonText: '#33564a',
  positive: '#2b8a63',
  positiveBg: '#eaf4ef',
  warning: '#b06a22',
  warningBg: '#fdf0e3',
  warningEdge: '#d98b3a',
  negative: '#b3452f',
  negativeBg: '#fbeae5',
  sidebarBg: '#12352a',
  sidebarText: '#b9d2c7',
  sidebarLabel: '#6e9384',
  sidebarIcon: '#3d6153',
  sidebarActiveBg: '#3fae7d',
  sidebarActiveText: '#06231a',
}

export function buildTheme() {
  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: brand.mint, dark: brand.ink, contrastText: brand.inkContrast },
      // Mint is the only brand accent, so any component that falls back to the
      // "secondary" or "info" palette slots (MUI default: purple / blue) stays on-brand.
      secondary: { main: brand.mint, dark: brand.ink, contrastText: brand.inkContrast },
      info: { main: brand.mint, light: '#eaf6f0', contrastText: brand.inkContrast },
      success: { main: brand.positive, light: brand.positiveBg, contrastText: '#ffffff' },
      warning: { main: brand.warning, light: brand.warningBg, contrastText: '#ffffff' },
      error: { main: brand.negative, light: brand.negativeBg, contrastText: '#ffffff' },
      background: { default: brand.canvas, paper: brand.surface },
      text: { primary: brand.textPrimary, secondary: brand.textSecondary, disabled: brand.textMuted },
      divider: brand.borderCard,
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Figtree", system-ui, sans-serif',
      h1: { fontWeight: 600 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontSize: '21px', fontWeight: 600, lineHeight: 1.3 },
      h6: { fontSize: '13.5px', fontWeight: 600 },
      body2: { fontSize: '13px' },
      caption: { fontSize: '11px', fontWeight: 500 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: brand.canvas },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, boxShadow: 'none' },
          containedPrimary: {
            backgroundColor: brand.ink,
            color: '#ffffff',
            '&:hover': { backgroundColor: '#0c2a21', boxShadow: 'none' },
          },
          outlined: {
            backgroundColor: brand.surface,
            borderColor: brand.secondaryButtonBorder,
            color: brand.secondaryButtonText,
            '&:hover': { borderColor: brand.mint, backgroundColor: brand.positiveBg },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', boxShadow: 'none' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: { padding: '14px 16px', '&:last-child': { paddingBottom: '14px' } },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 5, fontWeight: 600 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${brand.borderRow}`, padding: '9px 12px' },
          head: {
            fontSize: '9.5px',
            fontWeight: 600,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: brand.textSecondary,
            borderBottom: `1px solid ${brand.borderInner}`,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: brand.positiveBg },
            '&.Mui-selected': { backgroundColor: brand.positiveBg },
            '&.Mui-selected:hover': { backgroundColor: brand.positiveBg },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundImage: 'none' },
        },
      },
    },
  })
}

export const monoFontFamily = "'JetBrains Mono', monospace"
