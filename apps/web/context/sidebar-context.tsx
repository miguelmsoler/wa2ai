'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

/**
 * Sidebar context type definition.
 */
type SidebarContextType = {
  /** Whether sidebar is expanded on desktop */
  isExpanded: boolean
  /** Whether mobile sidebar drawer is open */
  isMobileOpen: boolean
  /** Whether sidebar is hovered (for hover expansion when collapsed) */
  isHovered: boolean
  /** Toggles sidebar expansion on desktop */
  toggleSidebar: () => void
  /** Toggles mobile sidebar drawer */
  toggleMobileSidebar: () => void
  /** Sets hover state (for hover expansion) */
  setIsHovered: (isHovered: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

/**
 * Hook to access sidebar context.
 * 
 * Provides access to sidebar state and control functions.
 * Must be used within a SidebarProvider component.
 * 
 * @returns Sidebar context with state and control functions
 * @throws {Error} If used outside SidebarProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isExpanded, toggleSidebar } = useSidebar()
 *   return <button onClick={toggleSidebar}>Toggle</button>
 * }
 * ```
 */
export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

/**
 * Sidebar provider component.
 * 
 * Manages sidebar state and responsive behavior:
 * - Tracks expansion state (desktop)
 * - Tracks mobile drawer state
 * - Handles responsive breakpoints (collapses on mobile < 1024px)
 * - Manages hover state for hover expansion
 * 
 * Automatically adjusts behavior based on screen size:
 * - Desktop (>= 1024px): Sidebar can be expanded/collapsed
 * - Mobile (< 1024px): Sidebar is always collapsed, opens as drawer overlay
 * 
 * @param props - SidebarProvider props
 * @param props.children - React children to wrap with sidebar context
 * @returns Sidebar context provider component
 */
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  /**
   * Handles window resize to detect mobile/desktop breakpoint.
   * 
   * Monitors window width and:
   * - Detects mobile breakpoint (< 1024px, Tailwind's 'lg' breakpoint)
   * - Closes mobile drawer when switching to desktop
   * - Updates mobile state for responsive behavior
   */
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) {
        setIsMobileOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev)
  }

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev)
  }

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobileOpen,
        isHovered,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
