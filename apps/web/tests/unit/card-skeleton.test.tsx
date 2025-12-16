/**
 * Unit tests for CardSkeleton component.
 * 
 * Tests component rendering and structure.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardSkeleton, CardSkeletonCustom } from '@/components/ui/card-skeleton'

describe('CardSkeleton', () => {
  it('should render card skeleton with header and content skeletons', () => {
    render(<CardSkeleton />)

    // Check that Card structure is present
    const card = document.querySelector('.rounded-xl.border')
    expect(card).toBeInTheDocument()

    // Check for skeleton elements (they have animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should apply custom className when provided', () => {
    const { container } = render(<CardSkeleton className="custom-class" />)
    
    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('should render multiple skeleton elements in header and content', () => {
    render(<CardSkeleton />)

    // Should have skeletons in header (title and description)
    // and in content (2 lines)
    const skeletons = document.querySelectorAll('.animate-pulse')
    // At least 4 skeletons: 2 in header, 2 in content
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })
})

describe('CardSkeletonCustom', () => {
  it('should render card with custom children content', () => {
    render(
      <CardSkeletonCustom>
        <div data-testid="custom-content">Custom skeleton content</div>
      </CardSkeletonCustom>
    )

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.getByText('Custom skeleton content')).toBeInTheDocument()
  })

  it('should apply custom className when provided', () => {
    const { container } = render(
      <CardSkeletonCustom className="custom-class">
        <div>Content</div>
      </CardSkeletonCustom>
    )
    
    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('should render card structure with CardContent', () => {
    render(
      <CardSkeletonCustom>
        <div>Test content</div>
      </CardSkeletonCustom>
    )

    // Check that Card structure is present
    const card = document.querySelector('.rounded-xl.border')
    expect(card).toBeInTheDocument()
    
    // Content should be rendered
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
})
