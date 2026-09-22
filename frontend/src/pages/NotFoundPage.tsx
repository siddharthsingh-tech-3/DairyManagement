import { Box, Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
      <Typography variant="h3" fontWeight={600}>
        404
      </Typography>
      <Typography color="text.secondary">Page not found</Typography>
      <Button component={Link} to="/dashboard" variant="contained">
        Back to dashboard
      </Button>
    </Box>
  )
}
