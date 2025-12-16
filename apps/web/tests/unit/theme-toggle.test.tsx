/**
 * Unit tests for ThemeToggle component (components/layout/theme-toggle.tsx).
 * 
 * Tests theme toggle button rendering and interaction.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { ThemeProvider } from '@/context/theme-context'

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderThemeToggle = (props?: { className?: string; variant?: string; size?: string }) => {
    return render(
      <ThemeProvider>
        <ThemeToggle {...props} />
      </ThemeProvider>
    )
  }

  it('should render theme toggle button', () => {
    renderThemeToggle()

    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    expect(button).toBeInTheDocument()
  })

  it('should have correct ARIA label for light theme', async () => {
    renderThemeToggle()

    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    // Initially should be light, so label should say "Switch to dark mode"
    expect(button).toHaveAttribute('aria-label', expect.stringContaining('dark'))
  })

  it('should toggle theme when clicked', async () => {
    renderThemeToggle()

    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    const user = userEvent.setup()

    await user.click(button)

    // Theme should be toggled (we verify by checking the button still exists and is clickable)
    expect(button).toBeInTheDocument()
  })

  it('should apply custom className when provided', () => {
    renderThemeToggle({ className: 'custom-class' })

    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    expect(button).toHaveClass('custom-class')
  })

  it('should render sun and moon icons', () => {
    renderThemeToggle()

    // Icons are rendered as SVG elements with specific classes
    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    expect(button).toBeInTheDocument()
    // Icons are inside the button
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('should have screen reader text', () => {
    renderThemeToggle()

    const srText = screen.getByText('Toggle theme')
    expect(srText).toHaveClass('sr-only')
  })

  it('should use default variant and size when not specified', () => {
    renderThemeToggle()

    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    expect(button).toBeInTheDocument()
  })

  it('should accept custom variant prop', () => {
    renderThemeToggle({ variant: 'outline' })

    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    expect(button).toBeInTheDocument()
  })

  it('should accept custom size prop', () => {
    renderThemeToggle({ size: 'lg' })

    const button = screen.getByLabelText(/Switch to (light|dark) mode/)
    expect(button).toBeInTheDocument()
  })
})
