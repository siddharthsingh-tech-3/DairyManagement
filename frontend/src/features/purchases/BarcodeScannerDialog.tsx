import { useEffect, useRef } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Html5Qrcode } from 'html5-qrcode'

const SCANNER_ELEMENT_ID = 'purchase-barcode-scanner'

/** Camera-based barcode scanner dialog. Decodes a barcode/QR code and reports the
 * raw value to `onDetected`, which the caller matches against a product SKU. */
export function BarcodeScannerDialog({
  open,
  onClose,
  onDetected,
}: {
  open: boolean
  onClose: () => void
  onDetected: (value: string) => void
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let scanner: Html5Qrcode | null = null
    let rafId: number

    // The scanner target div mounts as part of the Dialog's enter transition, which
    // can lag a frame behind this effect — retry until it's actually in the DOM.
    const init = () => {
      if (cancelled) return
      if (!document.getElementById(SCANNER_ELEMENT_ID)) {
        rafId = requestAnimationFrame(init)
        return
      }
      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
      scannerRef.current = scanner
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            if (!cancelled) onDetected(decodedText)
          },
          () => {},
        )
        .catch(() => {})
    }
    init()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      if (scanner?.isScanning) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => scanner?.clear())
      }
      scannerRef.current = null
    }
  }, [open, onDetected])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Scan Barcode
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Point the camera at a product's barcode.
        </Typography>
        <Box id={SCANNER_ELEMENT_ID} sx={{ width: '100%', minHeight: 260 }} />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
