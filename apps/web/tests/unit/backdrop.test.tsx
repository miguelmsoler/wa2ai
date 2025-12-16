/**
 * Unit tests for Backdrop component (components/layout/backdrop.tsx).
 * 
 * Tests backdrop rendering and click behavior for mobile sidebar.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Backdrop } from '@/components/layout/backdrop'
import { SidebarProvider, useSidebar } from '@/context/sidebar-context'
import React from 'react'

// Helper component to open sidebar for testing
const SidebarOpener = () => {
  const { toggleMobileSidebar } = useSidebar()
  return <button onClick={toggleMobileSidebar} data-testid="open-sidebar">Open</button>
}

describe('Backdrop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderBackdrop = () => {
    return render(
      <SidebarProvider>
        <Backdrop />
        <SidebarOpener />
      </SidebarProvider>
    )
  }

  it('should not render when mobile sidebar is closed', () => {
    renderBackdrop()

    // Backdrop should not be in DOM when sidebar is closed
    // We check by looking for the backdrop's specific classes
    const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-black\\/50')
    expect(backdrop).not.toBeInTheDocument()
  })

  it('should render when mobile sidebar is open', async () => {
    renderBackdrop()

    const openButton = screen.getByTestId('open-sidebar')
    const user = userEvent.setup()

    await user.click(openButton)

    // Backdrop should now be rendered - find by class since there might be multiple generic elements
    const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-black\\/50')
    expect(backdrop).toBeInTheDocument()
  })

  it('should close sidebar when backdrop is clicked', async () => {
    renderBackdrop()

    const openButton = screen.getByTestId('open-sidebar')
    const user = userEvent.setup()

    // Open sidebar
    await user.click(openButton)

    const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-black\\/50')
    expect(backdrop).toBeInTheDocument()

    // Click backdrop to close
    if (backdrop) {
      await user.click(backdrop)
    }

    // Backdrop should be removed from DOM
    await waitFor(() => {
      expect(document.querySelector('.fixed.inset-0.z-40.bg-black\\/50')).not.toBeInTheDocument()
    })
  })

  it('should have correct ARIA attributes', async () => {
    renderBackdrop()

    const openButton = screen.getByTestId('open-sidebar')
    const user = userEvent.setup()

    await user.click(openButton)

    const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-black\\/50')
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
  })

  it('should have correct CSS classes for styling', async () => {
    renderBackdrop()

    const openButton = screen.getByTestId('open-sidebar')
    const user = userEvent.setup()

    await user.click(openButton)

    const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-black\\/50')
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'z-40', 'bg-black/50', 'lg:hidden')
  })
})
