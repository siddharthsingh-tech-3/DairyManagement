import { Alert, Snackbar } from '@mui/material'
import { useToastStore } from '@/store/uiStore'

export function GlobalToast() {
  const { message, severity, clear } = useToastStore()

  return (
    <Snackbar
      open={!!message}
      autoHideDuration={3200}
      onClose={clear}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={clear} severity={severity} variant="filled" sx={{ fontWeight: 600 }}>
        {message}
      </Alert>
    </Snackbar>
  )
}
