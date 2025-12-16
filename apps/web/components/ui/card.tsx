import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card container component.
 * 
 * Provides a styled container for card content with border, shadow, and rounded corners.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for card container
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

/**
 * Card header component.
 * 
 * Container for card title and description with proper spacing.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for card header
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

/**
 * Card title component.
 * 
 * Styled heading for card titles with proper typography.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for card title
 */
const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

/**
 * Card description component.
 * 
 * Styled text for card descriptions with muted foreground color.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for card description
 */
const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

/**
 * Card content component.
 * 
 * Container for main card content with proper padding.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for card content
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

/**
 * Card footer component.
 * 
 * Container for card footer content (typically action buttons) with proper spacing.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for card footer
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
