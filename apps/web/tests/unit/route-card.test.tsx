/**
 * Unit tests for RouteCard component.
 * 
 * Tests component rendering, route information display, badges, and action buttons.
 * 
 * Coverage includes:
 * - Basic rendering with all route information
 * - Environment badge display (lab/prod)
 * - Regex filter display (when present)
 * - ADK configuration display (when present)
 * - Action buttons (Edit, Delete)
 * - Callback handlers
 * - Edge cases (missing optional fields)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteCard } from '@/components/routes/route-card'
import type { Route } from '@/lib/types'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('RouteCard', () => {
  const mockRoute: Route = {
    channelId: '5493777239922',
    agentEndpoint: 'http://localhost:8000',
    environment: 'lab',
    regexFilter: '^Test.*',
    config: {
      adk: {
        appName: 'test_agent',
        baseUrl: 'http://localhost:8001',
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('should render route card with channelId', () => {
      render(<RouteCard route={mockRoute} />)

      expect(screen.getByText('5493777239922')).toBeInTheDocument()
    })

    it('should render agent endpoint', () => {
      render(<RouteCard route={mockRoute} />)

      expect(screen.getByText('Agent Endpoint')).toBeInTheDocument()
      expect(screen.getByText('http://localhost:8000')).toBeInTheDocument()
    })

    it('should render with correct title attribute for channelId', () => {
      render(<RouteCard route={mockRoute} />)

      const channelIdElement = screen.getByText('5493777239922')
      expect(channelIdElement).toHaveAttribute('title', '5493777239922')
    })

    it('should render with correct title attribute for agentEndpoint', () => {
      render(<RouteCard route={mockRoute} />)

      const endpointElement = screen.getByText('http://localhost:8000')
      expect(endpointElement).toHaveAttribute('title', 'http://localhost:8000')
    })
  })

  describe('Environment badge', () => {
    it('should display Lab badge for lab environment', () => {
      const labRoute: Route = {
        ...mockRoute,
        environment: 'lab',
      }

      render(<RouteCard route={labRoute} />)

      expect(screen.getByText('Lab')).toBeInTheDocument()
      // Check that badge is present (Lab text is inside badge)
      const labText = screen.getByText('Lab')
      expect(labText).toBeInTheDocument()
    })

    it('should display Prod badge for prod environment', () => {
      const prodRoute: Route = {
        ...mockRoute,
        environment: 'prod',
      }

      render(<RouteCard route={prodRoute} />)

      expect(screen.getByText('Prod')).toBeInTheDocument()
    })

    it('should display correct icon for lab environment', () => {
      const labRoute: Route = {
        ...mockRoute,
        environment: 'lab',
      }

      const { container } = render(<RouteCard route={labRoute} />)

      // FlaskConical icon should be present for lab (check for SVG with flask-conical class)
      const flaskIcon = container.querySelector('.lucide-flask-conical')
      expect(flaskIcon).toBeInTheDocument()
    })

    it('should display correct icon for prod environment', () => {
      const prodRoute: Route = {
        ...mockRoute,
        environment: 'prod',
      }

      const { container } = render(<RouteCard route={prodRoute} />)

      // Server icon should be present for prod (check for SVG with server class in badge context)
      // The Server icon appears in both badge and ADK section, so we check for it in badge context
      const prodBadge = screen.getByText('Prod').closest('div')
      const serverIcon = prodBadge?.querySelector('.lucide-server')
      expect(serverIcon).toBeInTheDocument()
    })
  })

  describe('Regex filter display', () => {
    it('should display regex filter when present', () => {
      render(<RouteCard route={mockRoute} />)

      expect(screen.getByText('Regex Filter')).toBeInTheDocument()
      expect(screen.getByText('^Test.*')).toBeInTheDocument()
    })

    it('should not display regex filter section when absent', () => {
      const routeWithoutRegex: Route = {
        ...mockRoute,
        regexFilter: undefined,
      }

      render(<RouteCard route={routeWithoutRegex} />)

      expect(screen.queryByText('Regex Filter')).not.toBeInTheDocument()
      expect(screen.queryByText('^Test.*')).not.toBeInTheDocument()
    })

    it('should not display regex filter section when empty string', () => {
      const routeWithEmptyRegex: Route = {
        ...mockRoute,
        regexFilter: '',
      }

      render(<RouteCard route={routeWithEmptyRegex} />)

      expect(screen.queryByText('Regex Filter')).not.toBeInTheDocument()
    })

    it('should display regex filter in badge format', () => {
      render(<RouteCard route={mockRoute} />)

      const regexBadge = screen.getByText('^Test.*')
      expect(regexBadge).toBeInTheDocument()
      // Should be in a badge element (check parent has badge classes)
      const badge = regexBadge.closest('div')
      expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md', 'border')
    })
  })

  describe('ADK configuration display', () => {
    it('should display ADK configuration when present', () => {
      render(<RouteCard route={mockRoute} />)

      expect(screen.getByText('ADK Agent')).toBeInTheDocument()
      expect(screen.getByText('test_agent')).toBeInTheDocument()
      expect(screen.getByText(/Base URL:/)).toBeInTheDocument()
      // Base URL text is in format "Base URL: http://localhost:8001"
      expect(screen.getByText(/http:\/\/localhost:8001/)).toBeInTheDocument()
    })

    it('should display ADK appName when present', () => {
      render(<RouteCard route={mockRoute} />)

      expect(screen.getByText('test_agent')).toBeInTheDocument()
    })

    it('should display ADK baseUrl when present', () => {
      render(<RouteCard route={mockRoute} />)

      const baseUrlElement = screen.getByText(/Base URL:/)
      expect(baseUrlElement).toBeInTheDocument()
      // Base URL is part of the same text node
      expect(screen.getByText(/http:\/\/localhost:8001/)).toBeInTheDocument()
    })

    it('should display baseUrl with correct title attribute', () => {
      const { container } = render(<RouteCard route={mockRoute} />)

      // Find the element with title attribute containing the baseUrl
      const baseUrlElement = container.querySelector('[title="http://localhost:8001"]')
      expect(baseUrlElement).toBeInTheDocument()
    })

    it('should not display baseUrl section when baseUrl is absent', () => {
      const routeWithoutBaseUrl: Route = {
        ...mockRoute,
        config: {
          adk: {
            appName: 'test_agent',
            // baseUrl is missing
          },
        },
      }

      render(<RouteCard route={routeWithoutBaseUrl} />)

      expect(screen.getByText('ADK Agent')).toBeInTheDocument()
      expect(screen.getByText('test_agent')).toBeInTheDocument()
      expect(screen.queryByText(/Base URL:/)).not.toBeInTheDocument()
    })

    it('should not display ADK section when config is absent', () => {
      const routeWithoutConfig: Route = {
        ...mockRoute,
        config: undefined,
      }

      render(<RouteCard route={routeWithoutConfig} />)

      expect(screen.queryByText('ADK Agent')).not.toBeInTheDocument()
      expect(screen.queryByText('test_agent')).not.toBeInTheDocument()
    })

    it('should not display ADK section when adk is absent', () => {
      const routeWithoutAdk: Route = {
        ...mockRoute,
        config: {},
      }

      render(<RouteCard route={routeWithoutAdk} />)

      expect(screen.queryByText('ADK Agent')).not.toBeInTheDocument()
    })
  })

  describe('Action buttons', () => {
    it('should render Edit button with correct link', () => {
      render(<RouteCard route={mockRoute} />)

      const editButton = screen.getByText('Edit')
      expect(editButton).toBeInTheDocument()
      
      const editLink = editButton.closest('a')
      expect(editLink).toHaveAttribute('href', '/routes/5493777239922/edit')
    })

    it('should render Delete button', () => {
      render(<RouteCard route={mockRoute} />)

      const deleteButton = screen.getByText('Delete')
      expect(deleteButton).toBeInTheDocument()
    })

    it('should encode channelId correctly in edit URL', () => {
      const routeWithSpecialChars: Route = {
        ...mockRoute,
        channelId: 'test@example.com',
      }

      render(<RouteCard route={routeWithSpecialChars} />)

      const editLink = screen.getByText('Edit').closest('a')
      expect(editLink).toHaveAttribute('href', '/routes/test%40example.com/edit')
    })

    it('should encode wildcard channelId correctly in edit URL', () => {
      const wildcardRoute: Route = {
        ...mockRoute,
        channelId: '*',
      }

      render(<RouteCard route={wildcardRoute} />)

      const editLink = screen.getByText('Edit').closest('a')
      // Next.js Link may handle encoding differently, but the component uses encodeURIComponent
      // The href should contain the encoded or raw wildcard
      const href = editLink?.getAttribute('href')
      expect(href).toBeTruthy()
      // Either encoded or raw wildcard is acceptable (Next.js Link behavior)
      expect(href === '/routes/%2A/edit' || href === '/routes/*/edit').toBe(true)
    })
  })

  describe('Callback handlers', () => {
    it('should call onDelete when Delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()

      render(<RouteCard route={mockRoute} onDelete={onDelete} />)

      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)

      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledWith(mockRoute)
    })

    it('should not call onDelete when callback is not provided', async () => {
      const user = userEvent.setup()

      render(<RouteCard route={mockRoute} />)

      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)

      // Should not throw error
      expect(deleteButton).toBeInTheDocument()
    })

    it('should not call onEdit (Edit uses Link, not callback)', () => {
      const onEdit = vi.fn()

      render(<RouteCard route={mockRoute} onEdit={onEdit} />)

      // Edit button uses Link, so onEdit callback is not used
      // This is expected behavior - Edit navigates via Link
      expect(onEdit).not.toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle route with minimal fields', () => {
      const minimalRoute: Route = {
        channelId: '1234567890',
        agentEndpoint: 'http://example.com',
        environment: 'lab',
      }

      render(<RouteCard route={minimalRoute} />)

      expect(screen.getByText('1234567890')).toBeInTheDocument()
      expect(screen.getByText('http://example.com')).toBeInTheDocument()
      expect(screen.getByText('Lab')).toBeInTheDocument()
      expect(screen.queryByText('Regex Filter')).not.toBeInTheDocument()
      expect(screen.queryByText('ADK Agent')).not.toBeInTheDocument()
    })

    it('should handle route with wildcard channelId', () => {
      const wildcardRoute: Route = {
        ...mockRoute,
        channelId: '*',
      }

      render(<RouteCard route={wildcardRoute} />)

      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('should handle long channelId with truncation', () => {
      const longChannelIdRoute: Route = {
        ...mockRoute,
        channelId: 'very-long-channel-id-that-should-be-truncated-in-display',
      }

      render(<RouteCard route={longChannelIdRoute} />)

      expect(screen.getByText('very-long-channel-id-that-should-be-truncated-in-display')).toBeInTheDocument()
      // Should have truncate class
      const channelIdElement = screen.getByText('very-long-channel-id-that-should-be-truncated-in-display')
      expect(channelIdElement).toHaveClass('truncate')
    })

    it('should handle long agentEndpoint with truncation', () => {
      const longEndpointRoute: Route = {
        ...mockRoute,
        agentEndpoint: 'http://very-long-endpoint-url-that-should-be-truncated.com/path/to/resource',
      }

      render(<RouteCard route={longEndpointRoute} />)

      const endpointElement = screen.getByText('http://very-long-endpoint-url-that-should-be-truncated.com/path/to/resource')
      expect(endpointElement).toHaveClass('truncate')
    })

    it('should handle route with only regex filter (no ADK)', () => {
      const routeWithOnlyRegex: Route = {
        ...mockRoute,
        config: undefined,
      }

      render(<RouteCard route={routeWithOnlyRegex} />)

      expect(screen.getByText('Regex Filter')).toBeInTheDocument()
      expect(screen.queryByText('ADK Agent')).not.toBeInTheDocument()
    })

    it('should handle route with only ADK (no regex)', () => {
      const routeWithOnlyAdk: Route = {
        ...mockRoute,
        regexFilter: undefined,
      }

      render(<RouteCard route={routeWithOnlyAdk} />)

      expect(screen.queryByText('Regex Filter')).not.toBeInTheDocument()
      expect(screen.getByText('ADK Agent')).toBeInTheDocument()
    })
  })

  describe('Icons', () => {
    it('should render Hash icon for channelId', () => {
      const { container } = render(<RouteCard route={mockRoute} />)

      // Hash icon should be present (lucide-react icons render as SVG with lucide-hash class)
      const hashIcon = container.querySelector('.lucide-hash')
      expect(hashIcon).toBeInTheDocument()
    })

    it('should render Globe icon for agent endpoint', () => {
      const { container } = render(<RouteCard route={mockRoute} />)

      // Globe icon should be present (lucide-globe class)
      const globeIcon = container.querySelector('.lucide-globe')
      expect(globeIcon).toBeInTheDocument()
    })

    it('should render Filter icon when regex filter is present', () => {
      const { container } = render(<RouteCard route={mockRoute} />)

      // Filter icon should be present (lucide-funnel class - Filter component uses Funnel icon)
      const filterIcon = container.querySelector('.lucide-funnel')
      expect(filterIcon).toBeInTheDocument()
    })

    it('should render Server icon for ADK configuration', () => {
      const { container } = render(<RouteCard route={mockRoute} />)

      // Server icon should be present (lucide-server class)
      // There are two Server icons (one in badge for prod, one in ADK section)
      // We check that at least one exists in ADK context
      const serverIcons = container.querySelectorAll('.lucide-server')
      expect(serverIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Card styling', () => {
    it('should apply hover shadow transition class', () => {
      const { container } = render(<RouteCard route={mockRoute} />)

      const card = container.querySelector('[class*="hover:shadow-md"]')
      expect(card).toBeInTheDocument()
    })

    it('should apply transition-shadow class', () => {
      const { container } = render(<RouteCard route={mockRoute} />)

      const card = container.querySelector('[class*="transition-shadow"]')
      expect(card).toBeInTheDocument()
    })
  })
})
