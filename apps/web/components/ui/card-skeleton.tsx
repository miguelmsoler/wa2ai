/**
 * Card skeleton component.
 * 
 * Provides a loading skeleton for card components.
 * Used to show loading states while data is being fetched.
 * 
 * @module components/ui/card-skeleton
 */

import { Card, CardContent, CardHeader } from './card'
import { Skeleton } from './skeleton'

/**
 * Card skeleton component.
 * 
 * Displays a skeleton loading state for a card with header and content.
 * 
 * @param className - Optional additional CSS classes
 * @returns React component for card skeleton
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mt-2" />
      </CardContent>
    </Card>
  )
}

/**
 * Card skeleton with custom content.
 * 
 * Allows customizing the skeleton content while maintaining card structure.
 * 
 * @param children - Custom skeleton content
 * @param className - Optional additional CSS classes
 * @returns React component for custom card skeleton
 */
export function CardSkeletonCustom({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  )
}
