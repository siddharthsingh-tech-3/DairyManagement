import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, AlertTitle, Box, Button } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, maxWidth: 640, mx: 'auto' }}>
          <Alert severity="error">
            <AlertTitle>Something went wrong</AlertTitle>
            {this.state.error.message}
          </Alert>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}
