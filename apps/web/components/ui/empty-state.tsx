/**
 * Empty state component.
 * 
 * Displays a user-friendly message when there is no content to show.
 * Typically used for empty lists, search results, or initial states.
 * 
 * @module components/ui/empty-state
 */

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Props for EmptyState component.
 */
export interface EmptyStateProps {
  /** Icon to display (from lucide-react) */
  icon?: LucideIcon
  /** Main title text */
  title: string
  /** Description text below title */
  description?: string
  /** Optional action button */
  action?: React.ReactNode
  /** Optional additional CSS classes */
  className?: string
}

/**
 * Empty state component.
 * 
 * Displays a centered message with optional icon, title, description, and action button.
 * Used to indicate when there is no content to display (e.g., empty lists).
 * 
 * @param props - EmptyState component props
 * @param props.icon - Optional icon component from lucide-react
 * @param props.title - Main title text (required)
 * @param props.description - Optional description text
 * @param props.action - Optional action button or element
 * @param props.className - Optional additional CSS classes
 * @returns React component for empty state
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Route}
 *   title="No routes configured"
 *   description="Get started by creating your first route."
 *   action={<Button>Create Route</Button>}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
