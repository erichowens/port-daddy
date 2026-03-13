}
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActivityFeed } from './ActivityFeed'
import { useActivityStream } from '@/hooks/useActivityStream'

vi.mock('@/hooks/useActivityStream')

describe('ActivityFeed', () => {
  it('renders a list of activities', () => {
    (useActivityStream as any).mockReturnValue({
      activities: [
        { id: 1, type: 'service.claim', details: 'port 3000', timestamp: Date.now() },
        { id: 2, type: 'lock.acquire', details: 'db-lock', timestamp: Date.now() },
      ],
      connected: true,
    })

    render(<ActivityFeed />)

    expect(screen.getByText(/service.claim/)).toBeInTheDocument()
    expect(screen.getByText(/lock.acquire/)).toBeInTheDocument()
    expect(screen.getByText(/port 3000/)).toBeInTheDocument()
  })

  it('shows connection status', () => {
    (useActivityStream as any).mockReturnValue({
      activities: [],
      connected: false,
    })

    render(<ActivityFeed />)
    expect(screen.getByText(/Disconnected/)).toBeInTheDocument()
  })
