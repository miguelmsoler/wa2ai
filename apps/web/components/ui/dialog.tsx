"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Dialog root component (from Radix UI).
 * 
 * Controls the open/closed state of the dialog.
 */
const Dialog = DialogPrimitive.Root

/**
 * Dialog trigger component (from Radix UI).
 * 
 * Button or element that opens the dialog when clicked.
 */
const DialogTrigger = DialogPrimitive.Trigger

/**
 * Dialog portal component (from Radix UI).
 * 
 * Renders dialog content in a portal to ensure proper z-index stacking.
 */
const DialogPortal = DialogPrimitive.Portal

/**
 * Dialog close component (from Radix UI).
 * 
 * Button or element that closes the dialog when clicked.
 */
const DialogClose = DialogPrimitive.Close

/**
 * Dialog overlay component.
 * 
 * Semi-transparent backdrop that appears behind the dialog content.
 * 
 * @param props - Dialog overlay props from Radix UI
 * @param props.className - Optional additional CSS classes
 * @returns React component for dialog overlay
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Dialog content component.
 * 
 * Main container for dialog content with proper positioning, animations,
 * and close button.
 * 
 * @param props - Dialog content props from Radix UI
 * @param props.className - Optional additional CSS classes
 * @param props.children - Dialog content
 * @returns React component for dialog content
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * Dialog header component.
 * 
 * Container for dialog title and description with proper spacing.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for dialog header
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

/**
 * Dialog footer component.
 * 
 * Container for dialog action buttons with proper spacing and responsive layout.
 * 
 * @param props - Standard HTML div attributes
 * @param props.className - Optional additional CSS classes
 * @returns React component for dialog footer
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

/**
 * Dialog title component.
 * 
 * Styled heading for dialog titles with proper typography.
 * 
 * @param props - Dialog title props from Radix UI
 * @param props.className - Optional additional CSS classes
 * @returns React component for dialog title
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/**
 * Dialog description component.
 * 
 * Styled text for dialog descriptions with muted foreground color.
 * 
 * @param props - Dialog description props from Radix UI
 * @param props.className - Optional additional CSS classes
 * @returns React component for dialog description
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
