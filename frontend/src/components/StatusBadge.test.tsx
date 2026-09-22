import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the status text by default', () => {
    render(<StatusBadge status="delivered" />)
    expect(screen.getByText('delivered')).toBeInTheDocument()
  })

  it('renders a custom label when provided', () => {
    render(<StatusBadge status="draft" label="Walk-in" />)
    expect(screen.getByText('Walk-in')).toBeInTheDocument()
  })

  it('replaces underscores with spaces for unknown statuses', () => {
    render(<StatusBadge status="on_account" />)
    expect(screen.getByText('on account')).toBeInTheDocument()
  })
})
