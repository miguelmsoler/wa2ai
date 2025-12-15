'use client'

import { useSidebar } from '@/context/sidebar-context'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  statusBadge?: React.ReactNode // Optional status badge (e.g., connection status, user info, etc.)
  rightContent?: React.ReactNode // Optional right-side content (notifications, user menu, etc.)
}

export function Header({ statusBadge, rightContent }: HeaderProps) {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()

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
          {statusBadge}
          <ThemeToggle />
          {rightContent}
        </div>
      </div>
    </header>
  )
}
