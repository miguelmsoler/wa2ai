'use client'

import { useTheme } from '@/context/theme-context'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Theme toggle button props.
 */
interface ThemeToggleProps {
  /** Optional additional CSS classes */
  className?: string
  /** Button variant style */
  variant?: 'default' | 'ghost' | 'outline'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Theme toggle button component.
 * 
 * Provides a button to switch between light and dark themes.
 * Displays sun icon in light mode, moon icon in dark mode.
 * 
 * @param props - Theme toggle button props
 * @param props.className - Optional additional CSS classes
 * @param props.variant - Button variant style (default: 'ghost')
 * @param props.size - Button size (default: 'icon')
 * @returns React component for theme toggle button
 */
export function ThemeToggle({ 
  className,
  variant = 'ghost',
  size = 'icon'
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(className)}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
