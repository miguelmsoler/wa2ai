/**
 * Unit tests for sidebar context (context/sidebar-context.tsx).
 * 
 * Tests sidebar state management and responsive behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SidebarProvider, useSidebar } from '@/context/sidebar-context'
import React from 'react'

describe('SidebarContext', () => {
  let originalInnerWidth: number
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SidebarProvider>{children}</SidebarProvider>
  )

  describe('useSidebar', () => {
    it('should throw error when used outside SidebarProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useSidebar())
      }).toThrow('useSidebar must be used within a SidebarProvider')

      consoleError.mockRestore()
    })

    it('should return context when used inside SidebarProvider', () => {
      const { result } = renderHook(() => useSidebar(), { wrapper })

      expect(result.current).toBeDefined()
      expect(result.current.isExpanded).toBeDefined()
      expect(result.current.isMobileOpen).toBeDefined()
      expect(result.current.isHovered).toBeDefined()
      expect(result.current.toggleSidebar).toBeDefined()
      expect(result.current.toggleMobileSidebar).toBeDefined()
      expect(result.current.setIsHovered).toBeDefined()
    })
  })

  describe('SidebarProvider', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useSidebar(), { wrapper })

      expect(result.current.isExpanded).toBe(true)
      expect(result.current.isMobileOpen).toBe(false)
      expect(result.current.isHovered).toBe(false)
    })

    it('should register resize event listener on mount', () => {
      renderHook(() => useSidebar(), { wrapper })

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should remove resize event listener on unmount', () => {
      const { unmount } = renderHook(() => useSidebar(), { wrapper })

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('toggleSidebar', () => {
    it('should toggle isExpanded state', () => {
      const { result } = renderHook(() => useSidebar(), { wrapper })

      expect(result.current.isExpanded).toBe(true)

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.isExpanded).toBe(false)

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.isExpanded).toBe(true)
    })

    it('should not affect isExpanded on mobile (always false)', () => {
      // Set mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })

      const { result } = renderHook(() => useSidebar(), { wrapper })

      // Trigger resize to update mobile state
      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      expect(result.current.isExpanded).toBe(false)

      act(() => {
        result.current.toggleSidebar()
      })

      // On mobile, isExpanded should always be false
      expect(result.current.isExpanded).toBe(false)
    })
  })

  describe('toggleMobileSidebar', () => {
    it('should toggle isMobileOpen state', () => {
      const { result } = renderHook(() => useSidebar(), { wrapper })

      expect(result.current.isMobileOpen).toBe(false)

      act(() => {
        result.current.toggleMobileSidebar()
      })

      expect(result.current.isMobileOpen).toBe(true)

      act(() => {
        result.current.toggleMobileSidebar()
      })

      expect(result.current.isMobileOpen).toBe(false)
    })
  })

  describe('setIsHovered', () => {
    it('should update isHovered state', () => {
      const { result } = renderHook(() => useSidebar(), { wrapper })

      expect(result.current.isHovered).toBe(false)

      act(() => {
        result.current.setIsHovered(true)
      })

      expect(result.current.isHovered).toBe(true)

      act(() => {
        result.current.setIsHovered(false)
      })

      expect(result.current.isHovered).toBe(false)
    })
  })

  describe('Responsive behavior', () => {
    it('should detect desktop width (>= 1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      const { result } = renderHook(() => useSidebar(), { wrapper })

      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      // On desktop, isExpanded can be true
      expect(result.current.isExpanded).toBe(true)
    })

    it('should detect mobile width (< 1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })

      const { result } = renderHook(() => useSidebar(), { wrapper })

      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      // On mobile, isExpanded should be false
      expect(result.current.isExpanded).toBe(false)
    })

    it('should close mobile sidebar when switching to desktop', () => {
      // Start on mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })

      const { result } = renderHook(() => useSidebar(), { wrapper })

      act(() => {
        result.current.toggleMobileSidebar()
      })

      expect(result.current.isMobileOpen).toBe(true)

      // Switch to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      // Mobile sidebar should be closed
      expect(result.current.isMobileOpen).toBe(false)
    })

    it('should handle resize events correctly', () => {
      const { result } = renderHook(() => useSidebar(), { wrapper })

      // Initial desktop state
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      expect(result.current.isExpanded).toBe(true)

      // Resize to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })

      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      expect(result.current.isExpanded).toBe(false)
    })
  })
})
