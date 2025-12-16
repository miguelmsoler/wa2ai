/**
 * Hook for fetching WhatsApp connection status.
 * 
 * This hook provides reactive data fetching for connection status using SWR.
 * Following Clean Architecture, this is part of the Application Layer.
 * 
 * @module lib/hooks/use-connection-status
 */

'use client'

import useSWR from 'swr'
import { fetcher } from '../api/client'
import { logger, isDebugMode } from '../utils/logger'
import type { ConnectionState } from '../types'

/**
 * Refresh interval for connection status (in milliseconds).
 */
const STATUS_REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_STATUS_REFRESH_INTERVAL || '5000',
  10
)

/**
 * SWR hook for fetching WhatsApp connection status.
 * 
 * Automatically refreshes every STATUS_REFRESH_INTERVAL milliseconds.
 * 
 * @returns Object with connection state, loading state, and error state
 * 
 * @example
 * ```tsx
 * const { status, connected, qrAvailable, error, isLoading } = useConnectionStatus()
 * ```
 */
export function useConnectionStatus() {
  const { data, error } = useSWR<ConnectionState>(
    '/qr/status',
    (url: string) => fetcher<ConnectionState>(url),
    {
      refreshInterval: STATUS_REFRESH_INTERVAL,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: (err) => {
        logger.error('[useConnectionStatus] Error fetching connection status', {
          error: err instanceof Error ? err.message : String(err),
        })
      },
    }
  )

  if (isDebugMode() && data) {
    logger.debug('[useConnectionStatus] Data updated', {
      status: data.status,
      connected: data.connected,
      qrAvailable: data.qrAvailable,
    })
  }

  return {
    status: data?.status || 'disconnected',
    connected: data?.connected || false,
    qrAvailable: data?.qrAvailable || false,
    error: data?.error,
    isLoading: !error && !data,
  }
}
