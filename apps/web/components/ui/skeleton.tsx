import { cn } from "@/lib/utils"

/**
 * Skeleton loading component.
 * 
 * Provides a pulsing placeholder element for loading states.
 * Used to indicate that content is being loaded and improve perceived performance.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for skeleton loading placeholder
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
