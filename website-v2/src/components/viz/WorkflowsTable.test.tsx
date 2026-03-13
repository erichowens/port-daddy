import { render, screen } from '@testing-library/react'
import { WorkflowsTable } from './WorkflowsTable'
import { vi, describe, it, expect } from 'vitest'

vi.mock('@/hooks/useDaemonData', () => ({
  useDaemonData: () => ({ data: [], loading: false, error: null })
}))

describe('WorkflowsTable', () => {
  it('renders the table header', () => {
    render(<WorkflowsTable />)
    expect(screen.getByText(/Reactive Pipelines/i)).toBeDefined()
  })
})
