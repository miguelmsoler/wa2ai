'use client'

import { useConnectionStatus } from '@/lib/hooks/use-connection-status'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ConnectionStatusBadge component.
 * 
 * Displays the current WhatsApp connection status as a badge in the header.
 * Automatically updates via SWR polling.
 * 
 * States:
 * - Connected: Green badge showing "Connected"
 * - Connecting: Yellow badge showing "Connecting..."
 * - QR Ready: Blue badge showing "QR Ready"
 * - Disconnected: Red badge showing "Disconnected"
 * - Error: Red badge showing error message
 * - Loading: Shows spinner while fetching status
 */
export function ConnectionStatusBadge() {
  const { status, connected, qrAvailable, error, isLoading } = useConnectionStatus()

  // Determine badge variant and text based on status
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default'
  let text: string
  let className: string = ''

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </Badge>
    )
  }

  if (error) {
    variant = 'destructive'
    text = error.length > 30 ? `${error.substring(0, 30)}...` : error
    className = 'max-w-[200px] truncate bg-error-500 text-white border-error-500'
  } else if (connected && status === 'connected') {
    variant = 'default'
    text = 'Connected'
    className = 'bg-success-500 text-white border-success-500'
  } else if (status === 'qr_ready' && qrAvailable) {
    variant = 'default'
    text = 'QR Ready'
    className = 'bg-brand-500 text-white border-brand-500'
  } else if (status === 'connecting') {
    variant = 'default'
    text = 'Connecting...'
    className = 'bg-warning-500 text-white border-warning-500'
  } else {
    variant = 'destructive'
    text = 'Disconnected'
    className = 'bg-error-500 text-white border-error-500'
  }

  return (
    <Badge
      variant={variant}
      className={cn('font-medium', className)}
      title={error || `Status: ${status}`}
    >
      {text}
    </Badge>
  )
}
