'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

/**
 * Theme type: light or dark mode.
 */
type Theme = 'light' | 'dark'

/**
 * Theme context type definition.
 */
type ThemeContextType = {
  /** Current theme (light or dark) */
  theme: Theme
  /** Toggles between light and dark theme */
  toggleTheme: () => void
  /** Sets theme to a specific value */
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Theme provider component.
 * 
 * Manages theme state and persistence:
 * - Reads saved theme from localStorage on mount
 * - Falls back to system preference if no saved theme
 * - Persists theme changes to localStorage
 * - Applies 'dark' class to document element for Tailwind dark mode
 * 
 * Prevents hydration mismatch by initializing theme before first render.
 * 
 * @param props - ThemeProvider props
 * @param props.children - React children to wrap with theme context
 * @returns Theme context provider component
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<Theme>('light')
  const [isInitialized, setIsInitialized] = useState(false)

  /**
   * Initializes theme from localStorage or system preference.
   * 
   * Runs once on mount to:
   * - Check for saved theme preference in localStorage
   * - Fall back to system preference (prefers-color-scheme) if no saved preference
   * - Set initial theme state
   * - Mark as initialized to prevent hydration mismatches
   */
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light')

    setThemeState(initialTheme)
    setIsInitialized(true)
  }, [])

  /**
   * Persists theme changes and applies to DOM.
   * 
   * When theme changes:
   * - Saves preference to localStorage for persistence across sessions
   * - Applies or removes 'dark' class on document.documentElement
   *   (required for Tailwind CSS dark mode to work)
   * 
   * Only runs after initialization to prevent hydration mismatches.
   */
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('theme', theme)
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [theme, isInitialized])

  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access theme context.
 * 
 * Provides access to current theme and theme manipulation functions.
 * Must be used within a ThemeProvider component.
 * 
 * @returns Theme context with theme state and manipulation functions
 * @throws {Error} If used outside ThemeProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, toggleTheme } = useTheme()
 *   return <button onClick={toggleTheme}>Current: {theme}</button>
 * }
 * ```
 */
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
