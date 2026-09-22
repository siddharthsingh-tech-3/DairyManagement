import type { ReactNode } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { DataTable, type DataTableColumn } from '@/components/DataTable'

/**
 * One reusable "list + inline add-form + delete" card, used for every child
 * section of a partner's detail page (contributions, drawings, ratios, remuneration,
 * interest, loans, liabilities, responsibilities). The shape repeats 9 times with
 * only the columns/form/totals differing, so this is the single place that shape lives.
 */
export function PartnerChildRecordsCard<T>({
  title,
  rows,
  columns,
  getRowId,
  emptyMessage,
  footer,
  canEdit,
  onDelete,
  addForm,
}: {
  title: string
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  emptyMessage: string
  footer?: ReactNode
  canEdit: boolean
  onDelete?: (row: T) => void
  addForm?: ReactNode
}) {
  const allColumns: DataTableColumn<T>[] = [
    ...columns,
    ...(onDelete && canEdit
      ? [
          {
            key: '__delete',
            header: '',
            align: 'right' as const,
            hideable: false,
            render: (row: T) => (
              <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            ),
          },
        ]
      : []),
  ]

  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
      <Typography fontWeight={600} sx={{ mb: 2 }}>
        {title}
      </Typography>
      <DataTable columns={allColumns} rows={rows} getRowId={getRowId} emptyMessage={emptyMessage} />
      {footer && (
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>{footer}</Box>
      )}
      {canEdit && addForm && <Box sx={{ mt: 2 }}>{addForm}</Box>}
    </Box>
  )
}
