/**
 * Unit tests for EmptyState component.
 * 
 * Tests component rendering, props handling, and conditional rendering.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Route, Search, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

describe('EmptyState', () => {
  it('should render title when provided', () => {
    render(<EmptyState title="No items found" />)

    expect(screen.getByText('No items found')).toBeInTheDocument()
    expect(screen.getByText('No items found').tagName).toBe('H3')
  })

  it('should render description when provided', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adjusting your search criteria."
      />
    )

    expect(screen.getByText('Try adjusting your search criteria.')).toBeInTheDocument()
  })

  it('should not render description when not provided', () => {
    render(<EmptyState title="No items found" />)

    const description = screen.queryByText(/Try adjusting/)
    expect(description).not.toBeInTheDocument()
  })

  it('should render icon when provided', () => {
    render(<EmptyState title="No routes" icon={Route} />)

    // Icon should be rendered inside a container with rounded-full bg-muted
    const iconContainer = document.querySelector('.rounded-full.bg-muted')
    expect(iconContainer).toBeInTheDocument()
    
    // Icon should have the correct size classes
    const icon = iconContainer?.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('h-8', 'w-8')
  })

  it('should not render icon when not provided', () => {
    render(<EmptyState title="No items found" />)

    const iconContainer = document.querySelector('.rounded-full.bg-muted')
    expect(iconContainer).not.toBeInTheDocument()
  })

  it('should render action button when provided', () => {
    render(
      <EmptyState
        title="No routes"
        description="Create your first route"
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Route
          </Button>
        }
      />
    )

    expect(screen.getByText('Create Route')).toBeInTheDocument()
    expect(screen.getByText('Create Route').tagName).toBe('BUTTON')
  })

  it('should not render action when not provided', () => {
    render(<EmptyState title="No items found" />)

    const button = screen.queryByRole('button')
    expect(button).not.toBeInTheDocument()
  })

  it('should apply custom className when provided', () => {
    const { container } = render(
      <EmptyState title="No items" className="custom-class" />
    )

    const emptyState = container.firstChild as HTMLElement
    expect(emptyState).toHaveClass('custom-class')
  })

  it('should render all props together correctly', () => {
    render(
      <EmptyState
        icon={Search}
        title="No results found"
        description="Try a different search term"
        action={<Button>Clear Search</Button>}
        className="test-class"
      />
    )

    // Check title
    expect(screen.getByText('No results found')).toBeInTheDocument()

    // Check description
    expect(screen.getByText('Try a different search term')).toBeInTheDocument()

    // Check icon
    const iconContainer = document.querySelector('.rounded-full.bg-muted')
    expect(iconContainer).toBeInTheDocument()

    // Check action
    expect(screen.getByText('Clear Search')).toBeInTheDocument()

    // Check className
    const emptyState = document.querySelector('.test-class')
    expect(emptyState).toBeInTheDocument()
  })

  it('should have correct default styling classes', () => {
    const { container } = render(<EmptyState title="Test" />)

    const emptyState = container.firstChild as HTMLElement
    expect(emptyState).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'justify-center',
      'py-12',
      'px-4',
      'text-center'
    )
  })

  it('should render icon with correct styling', () => {
    render(<EmptyState title="Test" icon={Route} />)

    const iconContainer = document.querySelector('.rounded-full.bg-muted')
    expect(iconContainer).toBeInTheDocument()
    expect(iconContainer).toHaveClass('mb-4', 'flex', 'h-16', 'w-16', 'items-center', 'justify-center')

    const icon = iconContainer?.querySelector('svg')
    expect(icon).toHaveClass('h-8', 'w-8', 'text-muted-foreground')
  })

  it('should render title with correct styling', () => {
    render(<EmptyState title="Test Title" />)

    const title = screen.getByText('Test Title')
    expect(title).toHaveClass('mb-2', 'text-lg', 'font-semibold')
  })

  it('should render description with correct styling', () => {
    render(
      <EmptyState
        title="Test"
        description="Test description text"
      />
    )

    const description = screen.getByText('Test description text')
    expect(description).toHaveClass(
      'mb-6',
      'max-w-sm',
      'text-sm',
      'text-muted-foreground'
    )
  })

  it('should handle different icon types', () => {
    const { rerender } = render(<EmptyState title="Test" icon={Route} />)
    
    let iconContainer = document.querySelector('.rounded-full.bg-muted')
    expect(iconContainer).toBeInTheDocument()

    rerender(<EmptyState title="Test" icon={Search} />)
    
    iconContainer = document.querySelector('.rounded-full.bg-muted')
    expect(iconContainer).toBeInTheDocument()
  })

  it('should render complex action elements', () => {
    render(
      <EmptyState
        title="No items"
        action={
          <div>
            <Button className="mr-2">Action 1</Button>
            <Button variant="outline">Action 2</Button>
          </div>
        }
      />
    )

    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
  })
})
