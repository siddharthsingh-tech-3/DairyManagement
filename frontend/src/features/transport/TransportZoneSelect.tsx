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
import { createTransportZone, listTransportZones } from '@/api/transportZones'
import { useToastStore } from '@/store/uiStore'
import { extractErrorMessage } from '@/api/client'
import { EditTransportZoneDialog } from '@/features/transport/EditTransportZoneDialog'

interface TransportZoneSelectProps {
  /** Selected zone id, or null. */
  value: string | null
  onChange: (id: string | null, name: string | null) => void
  label?: string
  required?: boolean
  error?: boolean
  helperText?: string
  size?: 'small' | 'medium'
  fullWidth?: boolean
  sx?: SxProps<Theme>
}

export function TransportZoneSelect({
  value,
  onChange,
  label = 'Zone',
  required,
  error,
  helperText,
  size = 'small',
  fullWidth = true,
  sx,
}: TransportZoneSelectProps) {
  const toast = useToastStore((s) => s.show)
  const queryClient = useQueryClient()
  const anchorRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: zones = [] } = useQuery({ queryKey: ['transport-zones'], queryFn: listTransportZones })

  const selected = zones.find((z) => z.id === value) ?? null

  const closePopover = () => {
    setOpen(false)
    setQuery('')
    setAddingNew(false)
    setNewName('')
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => createTransportZone(name),
    onSuccess: async (zone) => {
      await queryClient.invalidateQueries({ queryKey: ['transport-zones'] })
      onChange(zone.id, zone.name)
      closePopover()
    },
    onError: (err) => toast(extractErrorMessage(err), 'error'),
  })

  const filtered = zones.filter((z) => z.name.toLowerCase().includes(query.trim().toLowerCase()))

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
        value={selected?.name ?? ''}
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
              placeholder="Search Zones"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Box>
          <Divider />
          <List dense sx={{ maxHeight: 260, overflowY: 'auto', py: 0 }}>
            {filtered.map((zone) => (
              <ListItemButton
                key={zone.id}
                selected={value === zone.id}
                onClick={() => {
                  onChange(zone.id, zone.name)
                  closePopover()
                }}
              >
                <ListItemText primary={`${zone.name} (${zone.bill_count})`} />
                <IconButton
                  size="small"
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditTarget({ id: zone.id, name: zone.name })
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
            {filtered.length === 0 && (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  No zones found
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
                  placeholder="Zone name"
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
                + Add/Manage Zone
              </Button>
            )}
          </Box>
        </Box>
      </Popover>
      <EditTransportZoneDialog
        open={!!editTarget}
        zone={editTarget}
        onClose={() => setEditTarget(null)}
        onRenamed={(_oldName, newName) => {
          if (editTarget && value === editTarget.id) onChange(editTarget.id, newName)
        }}
        onDeleted={() => {
          if (editTarget && value === editTarget.id) onChange(null, null)
        }}
      />
    </>
  )
}
