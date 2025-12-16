/**
 * Unit tests for cn utility (lib/utils/cn.ts).
 * 
 * Tests className merging utility using clsx and tailwind-merge.
 */

import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils/cn'

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz')
    expect(result).toBe('foo baz')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('should handle objects with boolean values', () => {
    const result = cn({
      foo: true,
      bar: false,
      baz: true,
    })
    expect(result).toBe('foo baz')
  })

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge should deduplicate conflicting classes
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle empty strings', () => {
    const result = cn('foo', '', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle mixed input types', () => {
    const result = cn(
      'base-class',
      ['array-class-1', 'array-class-2'],
      {
        'object-class-1': true,
        'object-class-2': false,
      },
      'string-class',
      undefined,
      null
    )
    expect(result).toContain('base-class')
    expect(result).toContain('array-class-1')
    expect(result).toContain('array-class-2')
    expect(result).toContain('object-class-1')
    expect(result).toContain('string-class')
    expect(result).not.toContain('object-class-2')
  })

  it('should handle Tailwind responsive classes', () => {
    const result = cn('md:px-2', 'md:px-4')
    expect(result).toBe('md:px-4')
  })

  it('should handle Tailwind state variants', () => {
    const result = cn('hover:bg-blue-500', 'hover:bg-red-500')
    expect(result).toBe('hover:bg-red-500')
  })

  it('should return empty string for no input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle complex real-world scenario', () => {
    const isActive = true
    const isDisabled = false
    const variant = 'primary'

    const result = cn(
      'px-4 py-2 rounded',
      {
        'bg-blue-500': variant === 'primary',
        'bg-gray-500': variant === 'secondary',
        'opacity-50 cursor-not-allowed': isDisabled,
        'ring-2 ring-blue-300': isActive,
      },
      isActive && 'font-bold',
      isDisabled && 'pointer-events-none'
    )

    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
    expect(result).toContain('rounded')
    expect(result).toContain('bg-blue-500')
    expect(result).toContain('ring-2')
    expect(result).toContain('ring-blue-300')
    expect(result).toContain('font-bold')
    expect(result).not.toContain('bg-gray-500')
    expect(result).not.toContain('opacity-50')
    expect(result).not.toContain('cursor-not-allowed')
    expect(result).not.toContain('pointer-events-none')
  })
})
