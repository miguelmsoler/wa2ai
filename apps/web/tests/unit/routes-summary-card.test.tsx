/**
 * Unit tests for RoutesSummaryCard component.
 * 
 * Tests component rendering, statistics calculation, and state handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoutesSummaryCard } from '@/components/dashboard/routes-summary-card'
import * as hooks from '@/lib/hooks/use-routes'
import type { Route } from '@/lib/types'

// Mock the hook
vi.mock('@/lib/hooks/use-routes', () => ({
  useRoutes: vi.fn(),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('RoutesSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display loading state with skeletons', () => {
    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: [],
      isLoading: true,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    // Check for skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    expect(screen.getByText('Active Routes')).toBeInTheDocument()
  })

  it('should display error state with alert', () => {
    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: [],
      isLoading: false,
      isError: new Error('Failed to load routes'),
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    expect(
      screen.getByText('Failed to load routes. Please try again later.')
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should display statistics for empty routes list', () => {
    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: [],
      isLoading: false,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    expect(screen.getByText('Total Routes')).toBeInTheDocument()
    expect(screen.getByText('Lab Routes')).toBeInTheDocument()
    expect(screen.getByText('Prod Routes')).toBeInTheDocument()
    
    // Check that all stats show 0
    const zeroElements = screen.getAllByText('0')
    expect(zeroElements.length).toBe(3) // Total, Lab, Prod
  })

  it('should calculate and display correct statistics for mixed routes', () => {
    const mockRoutes: Route[] = [
      {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        config: {
          adk: {
            appName: 'test_agent',
          },
        },
      },
      {
        channelId: '5493777239923',
        agentEndpoint: 'http://localhost:8001',
        environment: 'lab',
      },
      {
        channelId: '*',
        agentEndpoint: 'http://localhost:8002',
        environment: 'prod',
        regexFilter: '^Test.*',
      },
    ]

    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: mockRoutes,
      isLoading: false,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    // Check total
    const totalElements = screen.getAllByText('3')
    expect(totalElements.length).toBeGreaterThan(0)

    // Check lab routes (should be 2)
    const labElements = screen.getAllByText('2')
    expect(labElements.length).toBeGreaterThan(0)

    // Check prod routes (should be 1)
    const prodElements = screen.getAllByText('1')
    expect(prodElements.length).toBeGreaterThan(0)
  })

  it('should display only lab routes when all routes are lab', () => {
    const mockRoutes: Route[] = [
      {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      },
      {
        channelId: '5493777239923',
        agentEndpoint: 'http://localhost:8001',
        environment: 'lab',
      },
    ]

    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: mockRoutes,
      isLoading: false,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    // Total should be 2
    const totalElements = screen.getAllByText('2')
    expect(totalElements.length).toBeGreaterThanOrEqual(1) // At least total and lab
    
    // Lab count should be 2
    const labElements = screen.getAllByText('2')
    expect(labElements.length).toBeGreaterThanOrEqual(1)
    
    // Prod count should be 0
    const prodElements = screen.getAllByText('0')
    expect(prodElements.length).toBeGreaterThanOrEqual(1)
  })

  it('should display only prod routes when all routes are prod', () => {
    const mockRoutes: Route[] = [
      {
        channelId: '*',
        agentEndpoint: 'http://localhost:8000',
        environment: 'prod',
      },
    ]

    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: mockRoutes,
      isLoading: false,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    // Total should be 1
    const totalElements = screen.getAllByText('1')
    expect(totalElements.length).toBeGreaterThanOrEqual(1) // At least total and prod
    
    // Lab count should be 0
    const labElements = screen.getAllByText('0')
    expect(labElements.length).toBeGreaterThanOrEqual(1)
    
    // Prod count should be 1
    const prodElements = screen.getAllByText('1')
    expect(prodElements.length).toBeGreaterThanOrEqual(1)
  })

  it('should display action buttons with correct links', () => {
    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: [],
      isLoading: false,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    // Check Manage Routes button
    const manageButton = screen.getByText('Manage Routes')
    expect(manageButton).toBeInTheDocument()
    expect(manageButton.closest('a')).toHaveAttribute('href', '/routes')

    // Check New Route button
    const newRouteButton = screen.getByText('New Route')
    expect(newRouteButton).toBeInTheDocument()
    expect(newRouteButton.closest('a')).toHaveAttribute('href', '/routes/new')
  })

  it('should display card title and description', () => {
    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: [],
      isLoading: false,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    expect(screen.getByText('Active Routes')).toBeInTheDocument()
    expect(
      screen.getByText('Summary of configured message routing rules')
    ).toBeInTheDocument()
  })

  it('should handle undefined routes gracefully', () => {
    vi.mocked(hooks.useRoutes).mockReturnValue({
      routes: undefined as any,
      isLoading: false,
      isError: undefined,
      mutate: vi.fn(),
    })

    render(<RoutesSummaryCard />)

    // Should show 0 for all stats when routes is undefined
    const zeroElements = screen.getAllByText('0')
    expect(zeroElements.length).toBe(3) // Total, Lab, Prod
  })
})
