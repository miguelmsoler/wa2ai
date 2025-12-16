/**
 * Utility function for merging Tailwind CSS class names.
 * 
 * Combines clsx (conditional class names) with twMerge (Tailwind class merging).
 * This ensures that Tailwind classes are properly merged (e.g., 'p-2 p-4' becomes 'p-4')
 * while also handling conditional classes.
 * 
 * @param inputs - Class name values (strings, objects, arrays, or undefined)
 * @returns Merged class name string
 * 
 * @example
 * ```tsx
 * cn('p-2', 'p-4') // Returns 'p-4' (last one wins)
 * cn('bg-red-500', { 'text-white': isActive }) // Conditional classes
 * cn('base-class', className) // Merge with prop className
 * ```
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
