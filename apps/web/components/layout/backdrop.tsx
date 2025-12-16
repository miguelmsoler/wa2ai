'use client'

import { useSidebar } from '@/context/sidebar-context'

/**
 * Backdrop component for mobile sidebar overlay.
 * 
 * Displays a semi-transparent overlay behind the mobile sidebar drawer.
 * Clicking the backdrop closes the sidebar.
 * 
 * Only visible on mobile when sidebar is open.
 * Hidden on desktop (lg breakpoint and above).
 * 
 * @returns Backdrop overlay component (or null if sidebar is closed)
 */
export function Backdrop() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()

  if (!isMobileOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 lg:hidden"
      onClick={toggleMobileSidebar}
      aria-hidden="true"
    />
  )
}
