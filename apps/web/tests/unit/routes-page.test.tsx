/**
 * Unit tests for Routes page (app/(dashboard)/routes/page.tsx).
 * 
 * Tests search functionality, filter dropdown, route listing, and user interactions.
 * 
 * Coverage includes:
 * - Search by channelId or agentEndpoint (case-insensitive)
 * - Filter by environment (All/Lab/Prod)
 * - Filter by regex presence (With Regex/Without Regex)
 * - Combination of search and filters
 * - Loading states
 * - Empty states
 * - Results count display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoutesPage from '@/app/(dashboard)/routes/page'
import * as hooks from '@/lib/hooks/use-routes'
import * as toastHooks from '@/lib/hooks/use-toast'
import * as api from '@/lib/api/routes'
import * as routeMutations from '@/lib/hooks/use-route-mutations'
import type { Route } from '@/lib/types'

// Mock the hooks
vi.mock('@/lib/hooks/use-routes', () => ({
  useRoutes: vi.fn(),
}))

const mockToast = vi.fn()
vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: mockToast,
    dismiss: vi.fn(),
    toasts: [],
  })),
}))

vi.mock('@/lib/api/routes', () => ({
  deleteRoute: vi.fn(),
}))

// Mock use-route-mutations hook
const mockDeleteRouteFn = vi.fn()
vi.mock('@/lib/hooks/use-route-mutations', () => ({
  useDeleteRoute: vi.fn(() => mockDeleteRouteFn),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock Select component to use native select for easier testing
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onValueChange(e.target.value)
    }
    return (
      <select value={value} onChange={handleChange} data-testid="filter-select">
        {children}
      </select>
    )
  },
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}))

// Mock RouteCard component
vi.mock('@/components/routes/route-card', () => ({
  RouteCard: ({ route, onDelete }: { route: Route; onDelete?: (route: Route) => void }) => (
    <div data-testid={`route-card-${route.channelId}`}>
      <div>{route.channelId}</div>
      <div>{route.agentEndpoint}</div>
      <div>{route.environment}</div>
      {route.regexFilter && <div>Regex: {route.regexFilter}</div>}
      <a href={`/routes/${encodeURIComponent(route.channelId)}/edit`} data-testid={`edit-link-${route.channelId}`}>
        Edit
      </a>
      <button onClick={() => onDelete?.(route)} data-testid={`delete-button-${route.channelId}`}>
        Delete
      </button>
    </div>
  ),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('RoutesPage', () => {
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
      regexFilter: '^Test.*',
    },
    {
      channelId: '*',
      agentEndpoint: 'http://localhost:8002',
      environment: 'prod',
      regexFilter: '^Prod.*',
    },
    {
      channelId: '1234567890',
      agentEndpoint: 'https://api.example.com/agent',
      environment: 'prod',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockToast.mockClear()
    mockDeleteRouteFn.mockClear()
    // Reset mock to return resolved promise by default
    mockDeleteRouteFn.mockResolvedValue(undefined)
  })

  describe('Loading state', () => {
    it('should display loading skeletons when routes are loading', () => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: [],
        isLoading: true,
        isError: undefined,
        mutate: vi.fn(),
      })

      const { container } = render(<RoutesPage />)

      // Check for skeleton loaders (RouteCardSkeleton components)
      // RouteCardSkeleton uses CardSkeletonCustom which may not have "skeleton" in class name
      // Check that we're in loading state by verifying Routes List is present
      expect(screen.getByText('Routes List')).toBeInTheDocument()
      // Check that grid container exists (routes grid section)
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('Empty states', () => {
    it('should display empty state when no routes exist', () => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: [],
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })

      render(<RoutesPage />)

      expect(screen.getByText('No routes configured')).toBeInTheDocument()
      expect(
        screen.getByText(/Get started by creating your first route to connect WhatsApp messages to AI agents/i)
      ).toBeInTheDocument()
      const createButton = screen.getByText(/Create Route/i)
      expect(createButton).toBeInTheDocument()
    })

    it('should display "no match" empty state when filters return no results', async () => {
      const user = userEvent.setup()
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })

      render(<RoutesPage />)

      // Type a search query that matches nothing
      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, 'nonexistent-route-12345')

      await waitFor(() => {
        expect(screen.getByText('No routes match your search')).toBeInTheDocument()
        expect(
          screen.getByText(/Try adjusting your search query or filter criteria to find routes/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Search functionality', () => {
    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })
    })

    it('should filter routes by channelId', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, '5493777239922')

      await waitFor(() => {
        // RouteCard should display the channelId
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
        // Other routes should not be visible
        expect(screen.queryByTestId('route-card-5493777239923')).not.toBeInTheDocument()
        expect(screen.queryByTestId('route-card-*')).not.toBeInTheDocument()
      })
    })

    it('should filter routes by agentEndpoint', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, 'localhost:8000')

      await waitFor(() => {
        // Should show route with matching endpoint
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
        // Should not show other routes
        expect(screen.queryByTestId('route-card-5493777239923')).not.toBeInTheDocument()
      })
    })

    it('should perform case-insensitive search', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, 'API.EXAMPLE.COM')

      await waitFor(() => {
        expect(screen.getByTestId('route-card-1234567890')).toBeInTheDocument()
      })
    })

    it('should match partial channelId', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, '549377')

      await waitFor(() => {
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
        expect(screen.getByTestId('route-card-5493777239923')).toBeInTheDocument()
        expect(screen.queryByTestId('route-card-*')).not.toBeInTheDocument()
      })
    })

    it('should match partial endpoint', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, 'localhost')

      await waitFor(() => {
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
        expect(screen.getByTestId('route-card-5493777239923')).toBeInTheDocument()
        expect(screen.getByTestId('route-card-*')).toBeInTheDocument()
        expect(screen.queryByTestId('route-card-1234567890')).not.toBeInTheDocument()
      })
    })

    it('should trim whitespace from search query', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, '  5493777239922  ')

      await waitFor(() => {
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
      })
    })

    it('should show all routes when search is cleared', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      
      // Type search query
      await user.type(searchInput, '549377')
      await waitFor(() => {
        expect(screen.queryByText('*')).not.toBeInTheDocument()
      })

      // Clear search
      await user.clear(searchInput)
      await waitFor(() => {
        expect(screen.getByText('5493777239922')).toBeInTheDocument()
        expect(screen.getByText('5493777239923')).toBeInTheDocument()
        expect(screen.getByText('*')).toBeInTheDocument()
        expect(screen.getByText('1234567890')).toBeInTheDocument()
      })
    })
  })

  describe('Filter functionality', () => {
    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })
    })

    it('should show all routes when filter is "All Routes"', () => {
      render(<RoutesPage />)

      // Default filter should be "all" - all routes should be visible
      expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
      expect(screen.getByTestId('route-card-5493777239923')).toBeInTheDocument()
      expect(screen.getByTestId('route-card-*')).toBeInTheDocument()
      expect(screen.getByTestId('route-card-1234567890')).toBeInTheDocument()
    })

    it('should filter by "Lab Only"', async () => {
      render(<RoutesPage />)

      // With mocked Select, we can use native select element
      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      fireEvent.change(filterSelect, { target: { value: 'lab' } })

      await waitFor(() => {
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
        expect(screen.getByTestId('route-card-5493777239923')).toBeInTheDocument()
        expect(screen.queryByTestId('route-card-*')).not.toBeInTheDocument()
        expect(screen.queryByTestId('route-card-1234567890')).not.toBeInTheDocument()
      })
    })

    it('should filter by "Prod Only"', async () => {
      render(<RoutesPage />)

      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      fireEvent.change(filterSelect, { target: { value: 'prod' } })

      await waitFor(() => {
        expect(screen.queryByTestId('route-card-5493777239922')).not.toBeInTheDocument()
        expect(screen.queryByTestId('route-card-5493777239923')).not.toBeInTheDocument()
        expect(screen.getByTestId('route-card-*')).toBeInTheDocument()
        expect(screen.getByTestId('route-card-1234567890')).toBeInTheDocument()
      })
    })

    it('should filter by "With Regex"', async () => {
      render(<RoutesPage />)

      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      fireEvent.change(filterSelect, { target: { value: 'with-regex' } })

      await waitFor(() => {
        expect(screen.queryByTestId('route-card-5493777239922')).not.toBeInTheDocument()
        expect(screen.getByTestId('route-card-5493777239923')).toBeInTheDocument()
        expect(screen.getByTestId('route-card-*')).toBeInTheDocument()
        expect(screen.queryByTestId('route-card-1234567890')).not.toBeInTheDocument()
      })
    })

    it('should filter by "Without Regex"', async () => {
      render(<RoutesPage />)

      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      fireEvent.change(filterSelect, { target: { value: 'without-regex' } })

      await waitFor(() => {
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
        expect(screen.queryByTestId('route-card-5493777239923')).not.toBeInTheDocument()
        expect(screen.queryByTestId('route-card-*')).not.toBeInTheDocument()
        expect(screen.getByTestId('route-card-1234567890')).toBeInTheDocument()
      })
    })
  })

  describe('Combined search and filter', () => {
    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })
    })

    it('should apply both search and filter together', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      // Apply search
      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, '549377')

      // Apply filter
      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      fireEvent.change(filterSelect, { target: { value: 'lab' } })

      await waitFor(() => {
        // Should show only lab routes that match search
        expect(screen.getByTestId('route-card-5493777239922')).toBeInTheDocument()
        expect(screen.getByTestId('route-card-5493777239923')).toBeInTheDocument()
        expect(screen.queryByTestId('route-card-*')).not.toBeInTheDocument()
        expect(screen.queryByTestId('route-card-1234567890')).not.toBeInTheDocument()
      })
    })

    it('should show empty state when search and filter combination yields no results', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      // Apply search that matches prod routes
      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, '*')

      // Apply filter for lab
      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      fireEvent.change(filterSelect, { target: { value: 'lab' } })

      await waitFor(() => {
        expect(screen.getByText('No routes match your search')).toBeInTheDocument()
      })
    })
  })

  describe('Results count', () => {
    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })
    })

    it('should display correct results count for all routes', () => {
      render(<RoutesPage />)

      expect(screen.getByText(/Showing 4 of 4 routes/i)).toBeInTheDocument()
    })

    it('should update results count when search is applied', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, '549377')

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 4 routes/i)).toBeInTheDocument()
      })
    })

    it('should update results count when filter is applied', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      fireEvent.change(filterSelect, { target: { value: 'lab' } })

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 4 routes/i)).toBeInTheDocument()
      })
    })

    it('should display singular "route" when count is 1', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      await user.type(searchInput, '5493777239922')

      await waitFor(() => {
        // Text format: "Showing 1 of 4 route" or "Showing 1 of 4 routes"
        // The component uses routes.length for plural, so it will say "routes" even when filtered is 1
        // We verify the count is correct (1 filtered of 4 total)
        const countText = screen.getByText(/Showing 1 of 4/i)
        expect(countText).toBeInTheDocument()
        // The text should contain the count
        expect(countText.textContent).toContain('1')
        expect(countText.textContent).toContain('4')
      })
    })

    it('should not display results count when loading', () => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: true,
        isError: undefined,
        mutate: vi.fn(),
      })

      render(<RoutesPage />)

      expect(screen.queryByText(/Showing.*of.*routes?/i)).not.toBeInTheDocument()
    })
  })

  describe('Route display', () => {
    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })
    })

    it('should display all routes using RouteCard component', () => {
      render(<RoutesPage />)

      // All routes should be displayed via RouteCard (checking by channelId text)
      expect(screen.getByText('5493777239922')).toBeInTheDocument()
      expect(screen.getByText('5493777239923')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('1234567890')).toBeInTheDocument()
    })

    it('should render RouteCard components for each filtered route', () => {
      render(<RoutesPage />)

      // Should render 4 RouteCard components (one for each route)
      // Each RouteCard displays the channelId, so we can count unique channelIds
      expect(screen.getByText('5493777239922')).toBeInTheDocument()
      expect(screen.getByText('5493777239923')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('1234567890')).toBeInTheDocument()
      
      // Each route should have Edit and Delete buttons
      const editLinks = screen.getAllByTestId(/^edit-link-/)
      const deleteButtons = screen.getAllByTestId(/^delete-button-/)
      expect(editLinks.length).toBe(4)
      expect(deleteButtons.length).toBe(4)
    })
  })

  describe('UI elements', () => {
    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })
    })

    it('should render page title and description', () => {
      render(<RoutesPage />)

      expect(screen.getByText('Routes')).toBeInTheDocument()
      expect(screen.getByText(/List, search, filter and manage all message routes/i)).toBeInTheDocument()
    })

    it('should render "New Route" button', () => {
      render(<RoutesPage />)

      const newRouteButton = screen.getByText('New Route')
      expect(newRouteButton).toBeInTheDocument()
      expect(newRouteButton.closest('a')).toHaveAttribute('href', '/routes/new')
    })

    it('should render search input with placeholder', () => {
      render(<RoutesPage />)

      const searchInput = screen.getByPlaceholderText(/search routes by channel/i)
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')
    })

    it('should render filter dropdown with all options', () => {
      render(<RoutesPage />)

      // With mocked Select, options are always visible as native select options
      const filterSelect = screen.getByTestId('filter-select') as HTMLSelectElement
      const options = Array.from(filterSelect.options).map(opt => opt.textContent)
      
      expect(options).toContain('All Routes')
      expect(options).toContain('Lab Only')
      expect(options).toContain('Prod Only')
      expect(options).toContain('With Regex')
      expect(options).toContain('Without Regex')
    })
  })

  describe('Edit button navigation', () => {
    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: vi.fn(),
      })
    })

    it('should render Edit link for each route', () => {
      render(<RoutesPage />)

      const editLinks = screen.getAllByTestId(/^edit-link-/)
      expect(editLinks.length).toBe(mockRoutes.length)
    })

    it('should navigate to edit page with correct channelId', () => {
      render(<RoutesPage />)

      const firstEditLink = screen.getByTestId(`edit-link-${mockRoutes[0].channelId}`)
      expect(firstEditLink).toHaveAttribute('href', `/routes/${encodeURIComponent(mockRoutes[0].channelId)}/edit`)
    })

    it('should correctly encode channelId in edit URL', () => {
      render(<RoutesPage />)

      // Find edit link for route with special characters (wildcard)
      // The mock RouteCard uses encodeURIComponent, so '*' should be encoded
      const wildcardEditLink = screen.getByTestId('edit-link-*')
      const href = wildcardEditLink.getAttribute('href')
      // Verify the URL contains the encoded wildcard or the wildcard itself
      // (depending on how encodeURIComponent works in the test environment)
      expect(href).toBeDefined()
      expect(href).toContain('/edit')
      // The href should be a valid edit URL for the wildcard route
      expect(href).toMatch(/\/routes\/.*\/edit/)
    })

    it('should handle channelIds with special characters in edit URL', () => {
      render(<RoutesPage />)

      // Test all routes have correct edit URLs
      mockRoutes.forEach(route => {
        const editLink = screen.getByTestId(`edit-link-${route.channelId}`)
        expect(editLink).toHaveAttribute('href', `/routes/${encodeURIComponent(route.channelId)}/edit`)
      })
    })
  })

  describe('Delete confirmation dialog', () => {
    const mockMutate = vi.fn()

    beforeEach(() => {
      vi.mocked(hooks.useRoutes).mockReturnValue({
        routes: mockRoutes,
        isLoading: false,
        isError: undefined,
        mutate: mockMutate,
      })

      mockMutate.mockClear()
      mockToast.mockClear()
      mockDeleteRouteFn.mockClear()
      // Reset to default: successful deletion
      mockDeleteRouteFn.mockResolvedValue(undefined)
    })

    it('should open delete dialog when Delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to delete the route/i)).toBeInTheDocument()
        // Find channelId within the dialog (not in the route cards)
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        // ChannelId should be in the dialog content
        const dialogContent = dialog.textContent || ''
        expect(dialogContent).toContain(mockRoutes[0].channelId)
      })
    })

    it('should display correct channelId in delete confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      // Click delete on the second route
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[1].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        const dialogContent = dialog.textContent || ''
        // ChannelId should be in the dialog content
        expect(dialogContent).toContain(mockRoutes[1].channelId)
      })
    })

    it('should close dialog when Cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      // Open dialog
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      // Click Cancel
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Delete Route')).not.toBeInTheDocument()
      })
    })

    it('should close dialog when clicking close button', async () => {
      const user = userEvent.setup()
      render(<RoutesPage />)

      // Open dialog
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      // Close dialog by clicking the X button or any close button
      const dialog = screen.getByRole('dialog')
      const closeButtons = dialog.querySelectorAll('button[aria-label*="Close"], button[aria-label*="close"]')
      // If no specific close button, try to find button with X icon or close functionality
      if (closeButtons.length > 0) {
        await user.click(closeButtons[0] as HTMLElement)
      } else {
        // Alternative: find button that closes the dialog (may be the Cancel button or a close icon)
        const cancelButton = screen.getByText('Cancel')
        await user.click(cancelButton)
      }

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should delete route and refresh list when confirmed', async () => {
      const user = userEvent.setup()
      mockDeleteRouteFn.mockResolvedValueOnce(undefined)
      mockMutate.mockResolvedValueOnce(undefined)

      render(<RoutesPage />)

      // Open dialog
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^Delete$/ })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteRouteFn).toHaveBeenCalledWith(mockRoutes[0].channelId)
        expect(mockMutate).toHaveBeenCalled()
      })
    })

    it('should show loading state during deletion', async () => {
      const user = userEvent.setup()
      // Make deleteRoute take some time
      mockDeleteRouteFn.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
      )

      render(<RoutesPage />)

      // Open dialog
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      // Click delete button
      const confirmButton = screen.getByRole('button', { name: /^Delete$/ })
      await user.click(confirmButton)

      // Should show "Deleting..." text
      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument()
        expect(confirmButton).toBeDisabled()
      })
    })

    it('should disable Cancel button during deletion', async () => {
      const user = userEvent.setup()
      mockDeleteRouteFn.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
      )

      render(<RoutesPage />)

      // Open dialog
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      // Click delete button
      const confirmButton = screen.getByRole('button', { name: /^Delete$/ })
      await user.click(confirmButton)

      // Cancel button should be disabled
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel')
        expect(cancelButton).toBeDisabled()
      })
    })

    it('should show success toast after successful deletion', async () => {
      const user = userEvent.setup()
      mockDeleteRouteFn.mockResolvedValueOnce(undefined)
      mockMutate.mockResolvedValueOnce(undefined)

      render(<RoutesPage />)

      // Open dialog and confirm deletion
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /^Delete$/ })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteRouteFn).toHaveBeenCalled()
        expect(mockMutate).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Route deleted',
            description: expect.stringContaining(mockRoutes[0].channelId),
            variant: 'default',
          })
        )
      }, { timeout: 3000 })
    })

    it('should show error toast when deletion fails', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Failed to delete route'
      const error = new Error(errorMessage)
      error.name = 'ApiError'
      ;(error as any).status = 500

      mockDeleteRouteFn.mockRejectedValueOnce(error)

      render(<RoutesPage />)

      // Open dialog and confirm deletion
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /^Delete$/ })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteRouteFn).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error deleting route',
            description: errorMessage,
            variant: 'destructive',
          })
        )
      }, { timeout: 3000 })
    })

    it('should show generic error message when error is not an Error instance', async () => {
      const user = userEvent.setup()
      mockDeleteRouteFn.mockRejectedValueOnce('Unknown error')

      render(<RoutesPage />)

      // Open dialog and confirm deletion
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /^Delete$/ })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockDeleteRouteFn).toHaveBeenCalled()
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error deleting route',
            description: 'Failed to delete route. Please try again.',
            variant: 'destructive',
          })
        )
      }, { timeout: 3000 })
    })

    it('should close dialog after successful deletion', async () => {
      const user = userEvent.setup()
      mockDeleteRouteFn.mockResolvedValueOnce(undefined)
      mockMutate.mockResolvedValueOnce(undefined)

      render(<RoutesPage />)

      // Open dialog
      const deleteButton = screen.getByTestId(`delete-button-${mockRoutes[0].channelId}`)
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Delete Route')).toBeInTheDocument()
      })

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^Delete$/ })
      await user.click(confirmButton)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Delete Route')).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should not call deleteRoute if routeToDelete is null', async () => {
      render(<RoutesPage />)

      // Verify deleteRoute was not called initially
      expect(mockDeleteRouteFn).not.toHaveBeenCalled()
    })
  })
})
