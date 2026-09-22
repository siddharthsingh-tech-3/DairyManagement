import { useState } from 'react'
import { Button, InputAdornment, Menu, MenuItem, Stack, TextField } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PrintIcon from '@mui/icons-material/Print'
import DownloadIcon from '@mui/icons-material/Download'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { DateRangeFilter, type DateRangeValue } from './DateRangeFilter'

interface RecordsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  dateRange: DateRangeValue
  onDateRangeChange: (value: DateRangeValue) => void
  onPrint: () => void
  onDownloadPdf: () => void
  onDownloadExcel: () => void
}

export function RecordsToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search transactions…',
  dateRange,
  onDateRangeChange,
  onPrint,
  onDownloadPdf,
  onDownloadExcel,
}: RecordsToolbarProps) {
  const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(null)

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ mb: 1.5 }}>
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: 280, flex: 1 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" size="small" startIcon={<PrintIcon fontSize="small" />} onClick={onPrint}>
          Print
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon fontSize="small" />}
          endIcon={<ExpandMoreIcon fontSize="small" />}
          onClick={(e) => setDownloadAnchor(e.currentTarget)}
        >
          Download
        </Button>
        <Menu anchorEl={downloadAnchor} open={!!downloadAnchor} onClose={() => setDownloadAnchor(null)}>
          <MenuItem
            onClick={() => {
              setDownloadAnchor(null)
              onDownloadPdf()
            }}
          >
            Download as PDF
          </MenuItem>
          <MenuItem
            onClick={() => {
              setDownloadAnchor(null)
              onDownloadExcel()
            }}
          >
            Download as Excel
          </MenuItem>
        </Menu>
        <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
      </Stack>
    </Stack>
  )
}
