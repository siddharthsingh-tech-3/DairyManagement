import { useState } from 'react'
import { Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import { brand } from '@/theme/theme'

const DISMISS_KEY = 'products.offersBanner.dismissed'

export function OffersBanner({ onCreateOffer }: { onCreateOffer: () => void }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (dismissed) return null

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2.5,
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        borderTop: '3px solid',
        borderTopColor: brand.warningEdge,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <LocalOfferIcon sx={{ color: brand.warning }} />
        <Box>
          <Typography fontWeight={600} color="text.primary">
            Launch Offers on Your Items
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Create a discount offer to promote items to your vendors
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="contained" size="small" onClick={onCreateOffer}>
          Create Offer Now
        </Button>
        <IconButton
          size="small"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1')
            setDismissed(true)
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  )
}
