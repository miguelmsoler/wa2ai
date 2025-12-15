'use client'

import { useSidebar } from '@/context/sidebar-context'

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
