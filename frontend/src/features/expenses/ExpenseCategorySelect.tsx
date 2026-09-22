import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { createExpenseCategory, listExpenseCategories } from '@/api/expenseCategories'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { EditExpenseCategoryDialog } from '@/features/expenses/EditExpenseCategoryDialog'

interface ExpenseCategorySelectProps {
  /** Selected category name, or null. When `allowAll` is set, null means "All Expense Categories". */
  value: string | null
  onChange: (name: string | null) => void
  label?: string
  /** Adds a pinned "All Expense Categories" option representing a null selection — for filter use cases. */
  allowAll?: boolean
  required?: boolean
  error?: boolean
  helperText?: string
  size?: 'small' | 'medium'
  fullWidth?: boolean
  sx?: SxProps<Theme>
}

export function ExpenseCategorySelect({
  value,
  onChange,
  label = 'Expense Category',
  allowAll = false,
  required,
  error,
  helperText,
  size = 'small',
  fullWidth = true,
  sx,
}: ExpenseCategorySelectProps) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const anchorRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: categories = [] } = useQuery({ queryKey: ['expense-categories'], queryFn: listExpenseCategories })

  const closePopover = () => {
    setOpen(false)
    setQuery('')
    setAddingNew(false)
    setNewName('')
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => createExpenseCategory(name),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      onChange(category.name)
      closePopover()
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))

  const commitCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed || createMutation.isPending) return
    createMutation.mutate(trimmed)
  }

  return (
    <>
      <TextField
        ref={anchorRef}
        size={size}
        fullWidth={fullWidth}
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        value={value ?? (allowAll ? 'All Expense Categories' : '')}
        onClick={() => setOpen(true)}
        sx={{ cursor: 'pointer', '& .MuiInputBase-input': { cursor: 'pointer' }, ...sx }}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: <ArrowDropDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />,
          },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ width: Math.max(anchorRef.current?.offsetWidth ?? 0, 260) }}>
          <Box sx={{ p: 1 }}>
            <TextField
              autoFocus
              fullWidth
              size="small"
              placeholder="Search Categories"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Box>
          <Divider />
          <List dense sx={{ maxHeight: 260, overflowY: 'auto', py: 0 }}>
            {allowAll && (
              <ListItemButton
                selected={value === null}
                onClick={() => {
                  onChange(null)
                  closePopover()
                }}
              >
                <ListItemText primary="All Expense Categories" />
              </ListItemButton>
            )}
            {filtered.map((cat) => (
              <ListItemButton
                key={cat.id}
                selected={value === cat.name}
                onClick={() => {
                  onChange(cat.name)
                  closePopover()
                }}
              >
                <ListItemText primary={`${cat.name} (${cat.item_count})`} />
                <IconButton
                  size="small"
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditTarget({ id: cat.id, name: cat.name })
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
            {filtered.length === 0 && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  No categories found
                </Typography>
              </Box>
            )}
          </List>
          <Box sx={{ p: 1 }}>
            {addingNew ? (
              <Stack direction="row" spacing={0.5}>
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder="Category name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitCreate()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setAddingNew(false)
                    }
                  }}
                />
                <IconButton size="small" onClick={commitCreate} disabled={createMutation.isPending}>
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setAddingNew(false)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <Button fullWidth size="small" variant="outlined" onClick={() => setAddingNew(true)} sx={{ borderStyle: 'dashed' }}>
                + Add/Manage Category
              </Button>
            )}
          </Box>
        </Box>
      </Popover>
      <EditExpenseCategoryDialog
        open={!!editTarget}
        category={editTarget}
        onClose={() => setEditTarget(null)}
        onRenamed={(oldName, newName) => {
          if (value === oldName) onChange(newName)
        }}
        onDeleted={(name) => {
          if (value === name) onChange(allowAll ? null : '')
        }}
      />
    </>
  )
}
