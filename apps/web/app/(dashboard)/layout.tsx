'use client'

import { SidebarProvider, useSidebar } from '@/context/sidebar-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Backdrop } from '@/components/layout/backdrop'
import { cn } from '@/lib/utils'

/**
 * Internal layout content component.
 * 
 * Renders sidebar, header, and main content with proper spacing.
 * Calculates main content margin based on sidebar state to prevent overlap.
 * 
 * @param props - Layout content props
 * @param props.children - Page content to render in main area
 * @returns Layout content with sidebar, header, and main area
 */
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar()

  const mainContentMargin = isMobileOpen
    ? 'ml-0'
    : isExpanded || isHovered
    ? 'lg:ml-[290px]'
    : 'lg:ml-[90px]'

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <Backdrop />
      
      <div className={cn('flex-1 flex flex-col transition-all duration-300 ease-in-out', mainContentMargin)}>
        <Header />
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * Dashboard layout component.
 * 
 * Wraps dashboard pages with:
 * - SidebarProvider (manages sidebar state)
 * - Sidebar navigation component
 * - Header component
 * - Backdrop (for mobile sidebar overlay)
 * - Main content area with responsive margins
 * 
 * Provides consistent layout structure for all dashboard pages.
 * 
 * @param props - Dashboard layout props
 * @param props.children - Dashboard page content
 * @returns Dashboard layout component with sidebar and header
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}
