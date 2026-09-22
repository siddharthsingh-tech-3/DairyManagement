import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid2 as Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listSettings, updateSetting } from '@/api/settings'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'

const DEFAULT_PREFIXES: Record<string, string> = {
  quotation: 'EST-',
  sales_invoice: 'INV-',
  payment_in: 'PAY-IN-',
  sales_return: 'SR-',
  credit_note: 'CN-',
  delivery_challan: 'DC-',
  proforma_invoice: 'PF-',
}

/** Parametrized "Quick Settings" modal for a Sales document type — prefix +
 * sequence numbering (backed by the generic business_settings key/value store,
 * same keys the backend's SaleRepository.next_document_number reads), mirroring
 * PurchaseDocumentSettingsDialog. */
export function SalesDocumentSettingsDialog({
  open,
  onClose,
  docType,
  title,
  showToggles = true,
  showPriceHistory = true,
}: {
  open: boolean
  onClose: () => void
  docType:
    | 'quotation'
    | 'sales_invoice'
    | 'payment_in'
    | 'sales_return'
    | 'credit_note'
    | 'delivery_challan'
    | 'proforma_invoice'
  title: string
  showToggles?: boolean
  showPriceHistory?: boolean
}) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: listSettings, enabled: open })

  const [prefix, setPrefix] = useState(DEFAULT_PREFIXES[docType])
  const [seq, setSeq] = useState('1')
  const [showItemImage, setShowItemImage] = useState(false)
  const [showPriceHistoryToggle, setShowPriceHistoryToggle] = useState(false)

  useEffect(() => {
    if (!open) return
    const find = (key: string) => settings.find((s) => s.key === key)?.value
    setPrefix(find(`${docType}_prefix`) ?? DEFAULT_PREFIXES[docType])
    setSeq(find(`${docType}_seq`) ?? '1')
    setShowItemImage(find('show_item_image_on_invoice') === 'true')
    setShowPriceHistoryToggle(find('show_price_history') === 'true')
  }, [open, settings, docType])

  const mutation = useMutation({
    mutationFn: async () => {
      await updateSetting(`${docType}_prefix`, prefix)
      await updateSetting(`${docType}_seq`, seq)
      if (showToggles) await updateSetting('show_item_image_on_invoice', String(showItemImage))
      if (showPriceHistory) await updateSetting('show_price_history', String(showPriceHistoryToggle))
    },
    onSuccess: async () => {
      toast('Settings saved')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      onClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {title}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography fontWeight={500} fontSize={14}>
            Prefix &amp; Sequence Number
          </Typography>
          <Grid container spacing={2}>
            <Grid size={7}>
              <TextField label="Prefix" fullWidth value={prefix} onChange={(e) => setPrefix(e.target.value)} />
            </Grid>
            <Grid size={5}>
              <TextField
                label="Sequence Number"
                fullWidth
                type="number"
                value={seq}
                onChange={(e) => setSeq(e.target.value)}
              />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            Next document number: {prefix}
            {seq}
          </Typography>

          {(showToggles || showPriceHistory) && <Divider />}

          {showToggles && (
            <Stack>
              <FormControlLabel
                control={<Switch checked={showItemImage} onChange={(e) => setShowItemImage(e.target.checked)} />}
                label="Show Item Image on Invoice"
              />
              <Typography variant="caption" color="text.secondary">
                Applies to all vouchers except Payment In and Payment Out.
              </Typography>
            </Stack>
          )}

          {showPriceHistory && (
            <Stack>
              <FormControlLabel
                control={
                  <Switch checked={showPriceHistoryToggle} onChange={(e) => setShowPriceHistoryToggle(e.target.checked)} />
                }
                label="Price History"
              />
              <Typography variant="caption" color="text.secondary">
                Show last 5 sales/purchase prices of the item for the selected party.
              </Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button variant="contained" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
