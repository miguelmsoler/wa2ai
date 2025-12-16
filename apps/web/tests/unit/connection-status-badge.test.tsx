/**
 * Unit tests for ConnectionStatusBadge component.
 * 
 * Tests component rendering and status display logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatusBadge } from '@/components/layout/connection-status-badge'
import * as hooks from '@/lib/hooks/use-connection-status'

// Mock the hook
vi.mock('@/lib/hooks/use-connection-status', () => ({
  useConnectionStatus: vi.fn(),
}))

describe('ConnectionStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state with spinner', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: true,
    })

    render(<ConnectionStatusBadge />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    // Check for spinner icon (Loader2 component has animate-spin class)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should display Connected state with green badge', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'connected',
      connected: true,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText('Connected')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-success-500')
  })

  it('should display QR Ready state with blue badge', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'qr_ready',
      connected: false,
      qrAvailable: true,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText('QR Ready')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-brand-500')
  })

  it('should display Connecting state with yellow badge', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'connecting',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText('Connecting...')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-warning-500')
  })

  it('should display Disconnected state with red badge', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText('Disconnected')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-error-500')
  })

  it('should display error message when error is present', () => {
    const errorMessage = 'Connection failed'
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: errorMessage,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText(errorMessage)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-error-500')
  })

  it('should truncate long error messages', () => {
    const longError = 'A'.repeat(50)
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: longError,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText(/^A{30}\.\.\.$/)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('truncate')
  })

  it('should include status in title attribute', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'connected',
      connected: true,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText('Connected')
    expect(badge).toHaveAttribute('title', 'Status: connected')
  })

  it('should include error in title attribute when error is present', () => {
    const errorMessage = 'Connection timeout'
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: errorMessage,
      isLoading: false,
    })

    render(<ConnectionStatusBadge />)

    const badge = screen.getByText(errorMessage)
    expect(badge).toHaveAttribute('title', errorMessage)
  })
})

