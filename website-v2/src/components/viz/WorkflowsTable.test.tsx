}
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WorkflowsTable } from './WorkflowsTable'
import { useDaemonData } from '@/hooks/useDaemonData'

vi.mock('@/hooks/useDaemonData')

describe('WorkflowsTable', () => {
  it('renders a list of rules', () => {
    (useDaemonData as any).mockReturnValue({
      data: [
        { id: 1, name: 'Auto-Debug', channelPattern: 'build:failed', action: 'spawn', enabled: true },
        { id: 2, name: 'Notify-Slack', channelPattern: 'deploy:*', action: 'exec', enabled: false },
      ],
      loading: false,
    })

    render(<WorkflowsTable />)

    expect(screen.getByText('Auto-Debug')).toBeInTheDocument()
    expect(screen.getByText('build:failed')).toBeInTheDocument()
    expect(screen.getByText('Notify-Slack')).toBeInTheDocument()
  })
