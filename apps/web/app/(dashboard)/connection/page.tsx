/**
 * WhatsApp connection management page.
 * 
 * Displays QR code for WhatsApp authentication and connection status.
 * Allows users to connect their WhatsApp account to wa2ai.
 * 
 * @returns React component for connection management page
 */
'use client'

import { useConnectionStatus } from '@/lib/hooks/use-connection-status'
import { useQRImageUrl } from '@/lib/hooks/use-qr-image-url'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CardSkeletonCustom } from '@/components/ui/card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ConnectionPage() {
  const { status, connected, qrAvailable, error, isLoading } = useConnectionStatus()
  const qrImageUrl = useQRImageUrl()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Connection</h1>
        <p className="text-muted-foreground">
          Manage WhatsApp authentication and connection via QR code.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading connection status...'
              : connected
                ? 'WhatsApp is connected and ready to receive messages.'
                : qrAvailable
                  ? 'Scan the QR code below with your WhatsApp to connect.'
                  : 'Waiting for QR code to be generated...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-64 w-64 mx-auto rounded-lg" />
              <Skeleton className="h-4 w-full max-w-md mx-auto" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge
                  variant={connected ? 'default' : status === 'qr_ready' ? 'default' : 'destructive'}
                  className={cn(
                    connected
                      ? 'bg-success-500 text-white border-success-500'
                      : status === 'qr_ready'
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-error-500 text-white border-error-500'
                  )}
                >
                  {connected
                    ? 'Connected'
                    : status === 'qr_ready'
                      ? 'QR Ready'
                      : status === 'connecting'
                        ? 'Connecting...'
                        : 'Disconnected'}
                </Badge>
                {error && (
                  <span className="text-sm text-destructive" title={error}>
                    {error}
                  </span>
                )}
              </div>

              {qrAvailable && !connected && (
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-lg border p-4 bg-white">
                    <img
                      src={qrImageUrl}
                      alt="WhatsApp QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Open WhatsApp on your phone, go to Settings → Linked Devices, and scan this QR code.
                  </p>
                </div>
              )}

              {connected && (
                <div className="rounded-lg border bg-success-50 dark:bg-success-950 p-4">
                  <p className="text-sm text-success-900 dark:text-success-100">
                    ✓ WhatsApp is successfully connected. You can now receive and send messages through wa2ai.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
