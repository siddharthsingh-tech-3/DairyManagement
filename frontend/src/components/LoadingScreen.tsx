import { Box, CircularProgress } from '@mui/material'

export function LoadingScreen() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
      <CircularProgress />
    </Box>
  )
}
