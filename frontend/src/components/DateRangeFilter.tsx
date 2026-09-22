import { useState } from 'react'
import { type Dayjs } from 'dayjs'
import { Box, Button, Divider, List, ListItemButton, ListItemText, Popover, Stack, type SxProps, type Theme } from '@mui/material'
import EventIcon from '@mui/icons-material/Event'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { PickersDay, type PickersDayProps } from '@mui/x-date-pickers/PickersDay'
import { presetRange, type DatePreset, type DateRangeValue } from '@/utils/dateRange'

export type { DatePreset, DateRangeValue } from '@/utils/dateRange'

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'last_365_days', label: 'Last 365 Days' },
  { key: 'all_time', label: 'All Time' },
  { key: 'custom', label: 'Custom Date Range' },
]

function formatLabel(value: DateRangeValue): string {
  if (value.preset === 'all_time' || !value.start || !value.end) return 'All Time'
  if (value.preset === 'last_365_days') return 'Last 365 Days'
  if (value.start.isSame(value.end, 'day')) return value.start.format('MMM D, YYYY')
  return `${value.start.format('MMM D, YYYY')} - ${value.end.format('MMM D, YYYY')}`
}

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  sx?: SxProps<Theme>
}

export function DateRangeFilter({ value, onChange, sx }: DateRangeFilterProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [draftStart, setDraftStart] = useState<Dayjs | null>(null)
  const [draftEnd, setDraftEnd] = useState<Dayjs | null>(null)

  const open = (e: React.MouseEvent<HTMLElement>) => {
    setDraftStart(value.preset === 'custom' ? value.start : null)
    setDraftEnd(value.preset === 'custom' ? value.end : null)
    setAnchor(e.currentTarget)
  }
  const close = () => setAnchor(null)

  const choosePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      setDraftStart(null)
      setDraftEnd(null)
      return
    }
    const { start, end } = presetRange(preset)
    onChange({ preset, start, end })
    close()
  }

  const handleDayClick = (day: Dayjs) => {
    if (!draftStart || draftEnd) {
      setDraftStart(day)
      setDraftEnd(null)
      return
    }
    const start = day.isBefore(draftStart, 'day') ? day : draftStart
    const end = day.isBefore(draftStart, 'day') ? draftStart : day
    setDraftStart(start)
    setDraftEnd(end)
    onChange({ preset: 'custom', start: start.startOf('day'), end: end.endOf('day') })
    close()
  }

  function RangeDay(dayProps: PickersDayProps<Dayjs>) {
    const { day, outsideCurrentMonth, ...other } = dayProps
    const inRange =
      !outsideCurrentMonth && !!draftStart && !!draftEnd && !day.isBefore(draftStart, 'day') && !day.isAfter(draftEnd, 'day')
    const isEdge =
      !outsideCurrentMonth &&
      !!draftStart &&
      (day.isSame(draftStart, 'day') || (!!draftEnd && day.isSame(draftEnd, 'day')))
    return (
      <PickersDay
        {...other}
        day={day}
        outsideCurrentMonth={outsideCurrentMonth}
        onDaySelect={() => handleDayClick(day)}
        selected={isEdge}
        sx={
          inRange && !isEdge
            ? { bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 0, '&:hover': { bgcolor: 'primary.light' } }
            : undefined
        }
      />
    )
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<EventIcon fontSize="small" />}
        onClick={open}
        sx={{ whiteSpace: 'nowrap', flexShrink: 0, ...sx }}
      >
        {formatLabel(value)}
      </Button>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack direction="row">
          <List dense sx={{ width: 180, py: 1 }}>
            {PRESETS.map((p) => (
              <ListItemButton key={p.key} selected={value.preset === p.key} onClick={() => choosePreset(p.key)}>
                <ListItemText primary={p.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ p: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar value={draftEnd ?? draftStart ?? null} slots={{ day: RangeDay }} />
            </LocalizationProvider>
          </Box>
        </Stack>
      </Popover>
    </>
  )
}
