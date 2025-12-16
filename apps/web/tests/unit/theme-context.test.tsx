/**
 * Unit tests for theme context (context/theme-context.tsx).
 * 
 * Tests theme state management, localStorage persistence, and system preference detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/context/theme-context'
import React from 'react'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Mock matchMedia
const matchMediaMock = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})

describe('ThemeContext', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorageMock.clear()

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    // Mock matchMedia to return light by default
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => matchMediaMock(false)),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  )

  describe('useTheme', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useTheme())
      }).toThrow('useTheme must be used within a ThemeProvider')

      consoleError.mockRestore()
    })

    it('should return context when used inside ThemeProvider', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current).toBeDefined()
        expect(result.current.theme).toBeDefined()
        expect(result.current.toggleTheme).toBeDefined()
        expect(result.current.setTheme).toBeDefined()
      })
    })
  })

  describe('ThemeProvider initialization', () => {
    it('should initialize with light theme when no preference is saved', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
      })
    })

    it('should load saved theme from localStorage', async () => {
      localStorageMock.setItem('theme', 'dark')

      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
      })
    })

    it('should use system preference when no saved theme', async () => {
      // Mock system prefers dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn(() => matchMediaMock(true)),
      })

      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
      })
    })

    it('should prioritize saved theme over system preference', async () => {
      localStorageMock.setItem('theme', 'light')

      // Mock system prefers dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn(() => matchMediaMock(true)),
      })

      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
      })
    })
  })

  describe('toggleTheme', () => {
    it('should toggle from light to dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
      })

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe('dark')
    })

    it('should toggle from dark to light', async () => {
      localStorageMock.setItem('theme', 'dark')

      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
      })

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('should set theme to dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
      })

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })

    it('should set theme to light', async () => {
      localStorageMock.setItem('theme', 'dark')

      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
      })

      act(() => {
        result.current.setTheme('light')
      })

      expect(result.current.theme).toBe('light')
    })
  })

  describe('localStorage persistence', () => {
    it('should save theme to localStorage when changed', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
      })

      act(() => {
        result.current.setTheme('dark')
      })

      expect(localStorageMock.getItem('theme')).toBe('dark')
    })

    it('should update localStorage when theme is toggled', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
      })

      act(() => {
        result.current.toggleTheme()
      })

      expect(localStorageMock.getItem('theme')).toBe('dark')
    })
  })

  describe('DOM class management', () => {
    it('should add dark class to document when theme is dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('light')
      })

      act(() => {
        result.current.setTheme('dark')
      })

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should remove dark class from document when theme is light', async () => {
      localStorageMock.setItem('theme', 'dark')

      const { result } = renderHook(() => useTheme(), { wrapper })

      await waitFor(() => {
        expect(result.current.theme).toBe('dark')
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })

      act(() => {
        result.current.setTheme('light')
      })

      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should not modify DOM before initialization', () => {
      const initialClassList = document.documentElement.classList.toString()

      renderHook(() => useTheme(), { wrapper })

      // Should not modify DOM immediately (waits for initialization)
      expect(document.documentElement.classList.toString()).toBe(initialClassList)
    })
  })
})
