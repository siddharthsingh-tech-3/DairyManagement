import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Box,
  Checkbox,
  IconButton,
  InputAdornment,
  ListItemText,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Paper,
  Stack,
  Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  /** Column can be hidden via the column-visibility toggle. Defaults to true. */
  hideable?: boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  searchPlaceholder?: string
  searchPredicate?: (row: T, query: string) => boolean
  onRowClick?: (row: T) => void
  emptyMessage?: string
  /** Shows a column-visibility toggle (gear-adjacent "columns" icon). */
  columnVisibility?: boolean
  /** Shows a checkbox column and reports the selected row ids on change. */
  selectable?: boolean
  selected?: string[]
  onSelectionChange?: (ids: string[]) => void
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  searchPlaceholder = 'Search…',
  searchPredicate,
  onRowClick,
  emptyMessage = 'No records found',
  columnVisibility = false,
  selectable = false,
  selected,
  onSelectionChange,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<HTMLElement | null>(null)
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set())

  const selectedSet = selected ? new Set(selected) : internalSelected
  const setSelected = (next: Set<string>) => {
    if (!selected) setInternalSelected(next)
    onSelectionChange?.(Array.from(next))
  }

  const filtered = useMemo(() => {
    if (!query || !searchPredicate) return rows
    return rows.filter((r) => searchPredicate(r, query.toLowerCase()))
  }, [rows, query, searchPredicate])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return filtered
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sortKey, sortDir, columns])

  const paged = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const visibleColumns = columns.filter((c) => !hiddenKeys.has(c.key))

  // Selection can only ever reference rows that still exist in the data set.
  useEffect(() => {
    if (!selectable) return
    const validIds = new Set(rows.map(getRowId))
    const next = new Set(Array.from(selectedSet).filter((id) => validIds.has(id)))
    if (next.size !== selectedSet.size) setSelected(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const toggleColumn = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const pageIds = paged.map(getRowId)
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id))
  const someOnPageSelected = pageIds.some((id) => selectedSet.has(id))

  const toggleRow = (id: string) => {
    const next = new Set(selectedSet)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const toggleAllOnPage = () => {
    const next = new Set(selectedSet)
    if (allOnPageSelected) {
      pageIds.forEach((id) => next.delete(id))
    } else {
      pageIds.forEach((id) => next.add(id))
    }
    setSelected(next)
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {(searchPredicate || columnVisibility) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {searchPredicate ? (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              sx={{ maxWidth: 320 }}
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
          ) : (
            <Box />
          )}
          {columnVisibility && (
            <Tooltip title="Show/hide columns">
              <IconButton size="small" onClick={(e) => setColumnMenuAnchor(e.currentTarget)}>
                <ViewColumnIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Menu anchorEl={columnMenuAnchor} open={!!columnMenuAnchor} onClose={() => setColumnMenuAnchor(null)}>
            {columns
              .filter((c) => c.hideable !== false)
              .map((c) => (
                <MenuItem key={c.key} onClick={() => toggleColumn(c.key)} dense>
                  <Checkbox size="small" checked={!hiddenKeys.has(c.key)} />
                  <ListItemText primary={c.header} />
                </MenuItem>
              ))}
          </Menu>
        </Stack>
      )}
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    indeterminate={someOnPageSelected && !allOnPageSelected}
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                  />
                </TableCell>
              )}
              {visibleColumns.map((col) => (
                <TableCell key={col.key} align={col.align ?? 'left'}>
                  {col.sortValue ? (
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? sortDir : 'asc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.header}
                    </TableSortLabel>
                  ) : (
                    col.header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  align="center"
                  sx={{ py: 4, color: 'text.secondary' }}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {paged.map((row) => {
              const id = getRowId(row)
              return (
                <TableRow
                  key={id}
                  hover={!!onRowClick}
                  onClick={() => onRowClick?.(row)}
                  selected={selectedSet.has(id)}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {selectable && (
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={selectedSet.has(id)} onChange={() => toggleRow(id)} />
                    </TableCell>
                  )}
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key} align={col.align ?? 'left'}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Paper>
  )
}
