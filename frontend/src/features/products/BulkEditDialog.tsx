import { useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkUpdateProducts, type ProductUpdatePayload } from '@/api/products'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { CategorySelect } from '@/components/CategorySelect'

interface BulkEditDialogProps {
  open: boolean
  onClose: () => void
  selectedIds: string[]
}

export function BulkEditDialog({ open, onClose, selectedIds }: BulkEditDialogProps) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [applyCategory, setApplyCategory] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [applyGst, setApplyGst] = useState(false)
  const [gstPercent, setGstPercent] = useState(5)
  const [applyReorder, setApplyReorder] = useState(false)
  const [reorderLevel, setReorderLevel] = useState(0)
  const [applyStatus, setApplyStatus] = useState(false)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  const resetForm = () => {
    setApplyCategory(false)
    setCategory(null)
    setApplyGst(false)
    setGstPercent(5)
    setApplyReorder(false)
    setReorderLevel(0)
    setApplyStatus(false)
    setStatus('active')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const mutation = useMutation({
    mutationFn: () => {
      const updates: ProductUpdatePayload = {}
      if (applyCategory) updates.category = category
      if (applyGst) updates.gst_percent = gstPercent
      if (applyReorder) updates.reorder_level = reorderLevel
      if (applyStatus) updates.is_active = status === 'active'
      return bulkUpdateProducts(selectedIds, updates)
    },
    onSuccess: async (updated) => {
      toast(`${updated.length} items updated`)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      handleClose()
    },
    onError: (error) => toast(extractErrorMessage(error), 'error'),
  })

  const anyFieldSelected = applyCategory || applyGst || applyReorder || applyStatus
  const hasIncompleteCategory = applyCategory && !category

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Bulk edit items</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Editing {selectedIds.length} selected item{selectedIds.length === 1 ? '' : 's'}. Tick a field to overwrite it
          across all selected items.
        </Typography>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControlLabel
              control={<Checkbox checked={applyCategory} onChange={(e) => setApplyCategory(e.target.checked)} />}
              label="Category"
              sx={{ minWidth: 130 }}
            />
            <CategorySelect value={category} onChange={setCategory} disabled={!applyCategory} label="" />
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControlLabel
              control={<Checkbox checked={applyGst} onChange={(e) => setApplyGst(e.target.checked)} />}
              label="GST %"
              sx={{ minWidth: 130 }}
            />
            <TextField
              size="small"
              type="number"
              fullWidth
              disabled={!applyGst}
              value={gstPercent}
              onChange={(e) => setGstPercent(Number(e.target.value))}
            />
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControlLabel
              control={<Checkbox checked={applyReorder} onChange={(e) => setApplyReorder(e.target.checked)} />}
              label="Reorder level"
              sx={{ minWidth: 130 }}
            />
            <TextField
              size="small"
              type="number"
              fullWidth
              disabled={!applyReorder}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Number(e.target.value))}
            />
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FormControlLabel
              control={<Checkbox checked={applyStatus} onChange={(e) => setApplyStatus(e.target.checked)} />}
              label="Status"
              sx={{ minWidth: 130 }}
            />
            <TextField
              size="small"
              select
              fullWidth
              disabled={!applyStatus}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!anyFieldSelected || hasIncompleteCategory || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Update {selectedIds.length} items
        </Button>
      </DialogActions>
    </Dialog>
  )
}
