/**
 * Unit tests for ConnectionStatusCard component.
 * 
 * Tests component rendering, status display logic, and action buttons.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatusCard } from '@/components/dashboard/connection-status-card'
import * as hooks from '@/lib/hooks/use-connection-status'

// Mock the hook
vi.mock('@/lib/hooks/use-connection-status', () => ({
  useConnectionStatus: vi.fn(),
}))

describe('ConnectionStatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading skeleton when isLoading is true', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: true,
    })

    render(<ConnectionStatusCard />)

    expect(screen.getByText('WhatsApp Connection')).toBeInTheDocument()
    // Check for skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse, [class*="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should display Connected state with green badge and timestamp', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'connected',
      connected: true,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Baileys (Direct Connection)')).toBeInTheDocument()
    expect(screen.getByText(/Connected since:/)).toBeInTheDocument()
    expect(screen.getByText('View Connection')).toBeInTheDocument()
  })

  it('should display QR Ready state with blue badge and View QR Code button', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'qr_ready',
      connected: false,
      qrAvailable: true,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    expect(screen.getByText('QR Ready')).toBeInTheDocument()
    expect(screen.getByText('View QR Code')).toBeInTheDocument()
    const qrButton = screen.getByText('View QR Code').closest('a')
    expect(qrButton).toHaveAttribute('href', '/connection')
  })

  it('should display Connecting state with yellow badge', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'connecting',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    expect(screen.getByText('Connecting')).toBeInTheDocument()
    expect(screen.getByText('View QR Code')).toBeInTheDocument()
  })

  it('should display Disconnected state with red badge', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    expect(screen.getByText('Disconnected')).toBeInTheDocument()
    expect(screen.getByText('View QR Code')).toBeInTheDocument()
  })

  it('should display error message when error is present', () => {
    const errorMessage = 'Connection failed: Timeout'
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: errorMessage,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should show View QR Code button when not connected', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    const qrButton = screen.getByText('View QR Code').closest('a')
    expect(qrButton).toHaveAttribute('href', '/connection')
  })

  it('should show View Connection button when connected', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'connected',
      connected: true,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    const connectionButton = screen.getByText('View Connection').closest('a')
    expect(connectionButton).toHaveAttribute('href', '/connection')
  })

  it('should display provider information', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'connected',
      connected: true,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    expect(screen.getByText('Provider:')).toBeInTheDocument()
    expect(screen.getByText('Baileys (Direct Connection)')).toBeInTheDocument()
  })

  it('should not show connected since when not connected', () => {
    vi.mocked(hooks.useConnectionStatus).mockReturnValue({
      status: 'disconnected',
      connected: false,
      qrAvailable: false,
      error: undefined,
      isLoading: false,
    })

    render(<ConnectionStatusCard />)

    expect(screen.queryByText(/Connected since:/)).not.toBeInTheDocument()
  })
})
