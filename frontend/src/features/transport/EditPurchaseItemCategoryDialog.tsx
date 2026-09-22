import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { deletePurchaseItemCategory, renamePurchaseItemCategory } from '@/api/purchaseItemCategories'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface EditPurchaseItemCategoryDialogProps {
  open: boolean
  category: { id: string; name: string } | null
  onClose: () => void
  /** Called after a successful rename, so callers can update any locally-held selection. */
  onRenamed?: (oldName: string, newName: string) => void
  /** Called after a successful delete, so callers can clear any locally-held selection. */
  onDeleted?: (name: string) => void
}

export function EditPurchaseItemCategoryDialog({
  open,
  category,
  onClose,
  onRenamed,
  onDeleted,
}: EditPurchaseItemCategoryDialogProps) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    if (open && category) setName(category.name)
  }, [open, category])

  const renameMutation = useMutation({
    mutationFn: (newName: string) => renamePurchaseItemCategory(category!.id, newName),
    onSuccess: async (_updated, newName) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-item-categories'] })
      onRenamed?.(category!.name, newName)
      toast('Category updated')
      onClose()
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePurchaseItemCategory(category!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-item-categories'] })
      onDeleted?.(category!.name)
      toast('Category deleted')
      setConfirmDeleteOpen(false)
      onClose()
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed || !category || renameMutation.isPending) return
    if (trimmed === category.name) {
      onClose()
      return
    }
    renameMutation.mutate(trimmed)
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Edit {category?.name}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button color="error" onClick={() => setConfirmDeleteOpen(true)}>
            Delete Category
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={onClose} color="inherit" variant="outlined">
              Cancel
            </Button>
            <Button variant="contained" disabled={renameMutation.isPending} onClick={handleSave}>
              Save
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete category?"
        description={`This permanently removes "${category?.name}". Categories still assigned to transport bills can't be deleted.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </>
  )
}
