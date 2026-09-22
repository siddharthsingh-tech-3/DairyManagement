import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable, type DataTableColumn } from './DataTable'

interface Row {
  id: string
  name: string
  qty: number
}

const rows: Row[] = [
  { id: '1', name: 'Sharma Dairy Point', qty: 100 },
  { id: '2', name: 'Anand Milk Corner', qty: 40 },
  { id: '3', name: 'Gokul Provisions', qty: 80 },
]

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Name', sortValue: (r) => r.name, render: (r) => r.name },
  { key: 'qty', header: 'Qty', sortValue: (r) => r.qty, align: 'right', render: (r) => r.qty },
]

describe('DataTable', () => {
  it('renders all rows initially', () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} />)
    expect(screen.getByText('Sharma Dairy Point')).toBeInTheDocument()
    expect(screen.getByText('Anand Milk Corner')).toBeInTheDocument()
    expect(screen.getByText('Gokul Provisions')).toBeInTheDocument()
  })

  it('filters rows via the search box', async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        searchPredicate={(r, q) => r.name.toLowerCase().includes(q)}
      />,
    )
    await user.type(screen.getByPlaceholderText('Search…'), 'gokul')
    expect(screen.getByText('Gokul Provisions')).toBeInTheDocument()
    expect(screen.queryByText('Sharma Dairy Point')).not.toBeInTheDocument()
  })

  it('shows the empty message when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(r) => r.id} emptyMessage="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })
})
