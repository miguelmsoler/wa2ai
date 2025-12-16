'use client'

import { useSidebar } from '@/context/sidebar-context'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { ConnectionStatusBadge } from '@/components/layout/connection-status-badge'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'

/**
 * Header component props.
 */
interface HeaderProps {
  /** Optional right-side content (notifications, user menu, etc.) */
  rightContent?: React.ReactNode
}

/**
 * Header component for dashboard layout.
 * 
 * Provides:
 * - Sidebar toggle button (responsive: different behavior on mobile vs desktop)
 * - Connection status badge (shows WhatsApp connection state)
 * - Theme toggle button
 * - Optional right-side content slot
 * 
 * Responsive behavior:
 * - Mobile: Shows hamburger menu, logo, and status badge
 * - Desktop: Shows sidebar toggle, connection status, theme toggle, and right content
 * 
 * @param props - Header component props
 * @param props.rightContent - Optional content to display on the right side
 * @returns React component for application header
 */
export function Header({ rightContent }: HeaderProps) {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()

  /**
   * Handles sidebar toggle with responsive behavior.
   * 
   * On desktop (>= 1024px): Toggles sidebar expansion
   * On mobile (< 1024px): Toggles mobile drawer
   */
  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar()
    } else {
      toggleMobileSidebar()
    }
  }

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-border bg-background">
      <div className="flex w-full items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:h-11 lg:w-11"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <Link href="/dashboard" className="lg:hidden">
            <span className="text-lg font-semibold">wa2ai</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionStatusBadge />
          <ThemeToggle />
          {rightContent}
        </div>
      </div>
    </header>
  )
}
