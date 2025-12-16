'use client'

import { useConnectionStatus } from '@/lib/hooks/use-connection-status'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Smartphone, CheckCircle2, AlertCircle, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Connection Status Card component.
 * 
 * Displays WhatsApp connection status with details and actions.
 * Shows different states: Connected, Connecting, QR Ready, Disconnected, Error.
 * 
 * Features:
 * - Real-time status updates via SWR polling
 * - Status indicator with appropriate colors
 * - Provider information (Baileys)
 * - Connection timestamp (when connected)
 * - Action buttons (View QR Code, Disconnect)
 * 
 * @returns React component for connection status card
 */
export function ConnectionStatusCard() {
  const { status, connected, qrAvailable, error, isLoading } = useConnectionStatus()

  /**
   * Determines status display configuration based on current connection state.
   * 
   * Returns appropriate label, color, icon, and description for each status:
   * - Error: Red badge with error icon
   * - Connected: Green badge with check icon
   * - QR Ready: Blue badge with smartphone icon
   * - Connecting: Yellow badge with loading spinner
   * - Disconnected: Red badge with X icon
   * 
   * @returns Status configuration object with label, color, icon, and description
   */
  const getStatusConfig = () => {
    if (error) {
      return {
        label: 'Error',
        color: 'bg-error-500 text-white border-error-500',
        icon: <XCircle className="h-4 w-4" />,
        description: error,
      }
    }

    if (connected && status === 'connected') {
      return {
        label: 'Connected',
        color: 'bg-success-500 text-white border-success-500',
        icon: <CheckCircle2 className="h-4 w-4" />,
        description: 'WhatsApp is connected and ready',
      }
    }

    if (status === 'qr_ready' && qrAvailable) {
      return {
        label: 'QR Ready',
        color: 'bg-brand-500 text-white border-brand-500',
        icon: <Smartphone className="h-4 w-4" />,
        description: 'QR code available for scanning',
      }
    }

    if (status === 'connecting') {
      return {
        label: 'Connecting',
        color: 'bg-warning-500 text-white border-warning-500',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        description: 'Initializing WhatsApp connection...',
      }
    }

    return {
      label: 'Disconnected',
      color: 'bg-error-500 text-white border-error-500',
      icon: <XCircle className="h-4 w-4" />,
      description: 'WhatsApp is not connected',
    }
  }

  const statusConfig = getStatusConfig()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            WhatsApp Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          WhatsApp Connection
        </CardTitle>
        <CardDescription>Connection status and management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge
            variant="default"
            className={cn('font-medium', statusConfig.color)}
          >
            <span className="flex items-center gap-1.5">
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-medium">Baileys (Direct Connection)</span>
          </div>

          {connected && status === 'connected' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connected since:</span>
              <span className="font-medium">
                {new Date().toLocaleString()}
              </span>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-error-50 dark:bg-error-950 p-3 text-sm text-error-700 dark:text-error-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!error && statusConfig.description && (
            <p className="text-sm text-muted-foreground">
              {statusConfig.description}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {(status === 'qr_ready' || !connected) && (
          <Button asChild variant="outline" className="flex-1">
            <Link href="/connection">
              View QR Code
            </Link>
          </Button>
        )}
        {connected && status === 'connected' && (
          <Button asChild variant="default" className="flex-1">
            <Link href="/connection">
              View Connection
            </Link>
          </Button>
        )}
        {/* Disconnect button - future feature */}
        {/* {connected && (
          <Button variant="destructive" disabled>
            Disconnect
          </Button>
        )} */}
      </CardFooter>
    </Card>
  )
}
