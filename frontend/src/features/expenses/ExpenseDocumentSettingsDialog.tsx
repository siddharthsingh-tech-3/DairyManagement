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

const DEFAULT_PREFIX = 'EXP-'

/** "Quick Expense Settings" modal — prefix + sequence numbering backed by the generic
 * business_settings key/value store (same `expense_prefix`/`expense_seq` keys the
 * backend's ExpenseRepository.next_document_number reads), mirroring
 * PurchaseDocumentSettingsDialog. */
export function ExpenseDocumentSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: listSettings, enabled: open })

  const [prefix, setPrefix] = useState(DEFAULT_PREFIX)
  const [seq, setSeq] = useState('1')
  const [showItemImage, setShowItemImage] = useState(false)

  useEffect(() => {
    if (!open) return
    const find = (key: string) => settings.find((s) => s.key === key)?.value
    setPrefix(find('expense_prefix') ?? DEFAULT_PREFIX)
    setSeq(find('expense_seq') ?? '1')
    setShowItemImage(find('show_item_image_on_invoice') === 'true')
  }, [open, settings])

  const mutation = useMutation({
    mutationFn: async () => {
      await updateSetting('expense_prefix', prefix)
      await updateSetting('expense_seq', seq)
      await updateSetting('show_item_image_on_invoice', String(showItemImage))
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
        Quick Expense Settings
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography fontWeight={500} fontSize={14}>
            Expense Prefix &amp; Sequence Number
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
            Expense Number: {prefix}
            {seq}
          </Typography>

          <Divider />

          <Stack>
            <FormControlLabel
              control={<Switch checked={showItemImage} onChange={(e) => setShowItemImage(e.target.checked)} />}
              label="Show Item Image on Invoice"
            />
            <Typography variant="caption" color="text.secondary">
              Applies to all vouchers except Payment In and Payment Out.
            </Typography>
          </Stack>
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
