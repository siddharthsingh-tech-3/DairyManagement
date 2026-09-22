import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Card, Chip, IconButton, InputAdornment, Stack, SvgIconProps, TextField, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useToastStore } from '@/store/uiStore'
import { FILTER_CHIPS, REPORTS, type ReportCategory, type ReportDefinition } from '@/constants/reportsCatalog'
import { loadFavourites, setFavourite } from '@/utils/reportFavourites'
import { brand } from '@/theme/theme'

const COLLAPSE_THRESHOLD = 4

export function ReportsPage() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const [favourites, setFavourites] = useState<Set<string>>(loadFavourites)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleFavourite = (slug: string) => {
    setFavourites((prev) => setFavourite(slug, !prev.has(slug)))
  }

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase()
    return REPORTS.filter((r) => {
      const matchesSearch = !term || r.label.toLowerCase().includes(term)
      const matchesFilters = activeFilters.size === 0 || (r.tags ?? []).some((t) => activeFilters.has(t))
      return matchesSearch && matchesFilters
    })
  }, [search, activeFilters])

  const favouriteReports = visibleReports.filter((r) => favourites.has(r.slug))
  const byCategory = (category: ReportCategory) => visibleReports.filter((r) => r.category === category)

  const openReport = (slug: string) => navigate(`/reports/${slug}`)

  const renderList = (sectionKey: string, items: ReportDefinition[], withStar: boolean) => {
    const isExpanded = expanded[sectionKey] ?? true
    const shown = items.length > COLLAPSE_THRESHOLD && !isExpanded ? items.slice(0, COLLAPSE_THRESHOLD) : items

    return (
      <Stack spacing={1.5} sx={{ px: 2.5, py: 2 }}>
        {shown.map((r) => (
          <Stack key={r.slug} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography
              variant="body2"
              onClick={() => openReport(r.slug)}
              sx={{
                cursor: 'pointer',
                '&:hover': { color: 'primary.main', textDecoration: 'underline' },
              }}
            >
              {r.label}
            </Typography>
            {withStar && (
              <IconButton
                size="small"
                aria-label={`Remove ${r.label} from favourites`}
                onClick={() => toggleFavourite(r.slug)}
                sx={{ p: 0.25 }}
              >
                <StarIcon sx={{ fontSize: 18, color: brand.warning }} />
              </IconButton>
            )}
          </Stack>
        ))}
        {shown.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No reports found.
          </Typography>
        )}
        {items.length > COLLAPSE_THRESHOLD && (
          <Typography
            variant="body2"
            color="primary"
            onClick={() => setExpanded((prev) => ({ ...prev, [sectionKey]: !isExpanded }))}
            sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.25, width: 'fit-content', fontWeight: 600 }}
          >
            {isExpanded ? 'See less' : 'See more'}
            <ExpandLessIcon sx={{ fontSize: 16, transform: isExpanded ? 'none' : 'rotate(180deg)' }} />
          </Typography>
        )}
      </Stack>
    )
  }

  const renderSection = (
    sectionKey: string,
    label: string,
    Icon: ComponentType<SvgIconProps>,
    items: ReportDefinition[],
    withStar: boolean,
    gridArea: string,
  ) => (
    <Card variant="outlined" sx={{ gridArea, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="subtitle2" fontWeight={500} color="text.secondary">
          {label}
        </Typography>
      </Stack>
      {renderList(sectionKey, items, withStar)}
    </Card>
  )

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          Reports
        </Typography>
        <Button
          variant="contained"
          startIcon={<ShareOutlinedIcon />}
          onClick={() => toast('CA Reports Sharing is coming soon')}
        >
          CA Reports Sharing
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
          Filter By
        </Typography>
        {FILTER_CHIPS.map((chip) => (
          <Chip
            key={chip.key}
            label={chip.label}
            variant={activeFilters.has(chip.key) ? 'filled' : 'outlined'}
            color={activeFilters.has(chip.key) ? 'primary' : 'default'}
            onClick={() => toggleFilter(chip.key)}
            sx={{ borderRadius: 5, fontWeight: 600 }}
          />
        ))}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gridTemplateAreas: {
            xs: `"fav" "gst" "trans" "item" "party"`,
            md: `"fav gst trans" "item party trans"`,
          },
        }}
      >
        {renderSection('favourite', 'Favourite', AutoAwesomeOutlinedIcon, favouriteReports, true, 'fav')}
        {renderSection('gst', 'GST', ReceiptLongOutlinedIcon, byCategory('gst'), false, 'gst')}
        {renderSection('transaction', 'Transaction', DescriptionOutlinedIcon, byCategory('transaction'), false, 'trans')}
        {renderSection('item', 'Item', Inventory2OutlinedIcon, byCategory('item'), false, 'item')}
        {renderSection('party', 'Party', GroupsOutlinedIcon, byCategory('party'), false, 'party')}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <TextField
          inputRef={searchRef}
          size="small"
          placeholder="Find Report"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: !search && (
                <InputAdornment position="end">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ px: 0.75, py: 0.25, bgcolor: 'action.selected', borderRadius: 1, fontSize: 11, fontWeight: 500 }}>
                      Ctrl
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      +
                    </Typography>
                    <Box sx={{ px: 0.75, py: 0.25, bgcolor: 'action.selected', borderRadius: 1, fontSize: 11, fontWeight: 500 }}>
                      F
                    </Box>
                  </Stack>
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 280, bgcolor: 'background.paper' }}
        />
      </Box>
    </Stack>
  )
}
