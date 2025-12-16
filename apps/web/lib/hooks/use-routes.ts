/**
 * Hook for fetching all routes.
 * 
 * This hook provides reactive data fetching for routes using SWR.
 * Following Clean Architecture, this is part of the Application Layer.
 * 
 * @module lib/hooks/use-routes
 */

'use client'

import useSWR from 'swr'
import { fetcher } from '../api/client'
import { logger, isDebugMode } from '../utils/logger'
import type { Route, ApiResponse } from '../types'

/**
 * Refresh interval for routes (in milliseconds).
 */
const ROUTES_REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_ROUTES_REFRESH_INTERVAL || '10000',
  10
)

/**
 * SWR hook for fetching all routes.
 * 
 * Automatically refreshes every ROUTES_REFRESH_INTERVAL milliseconds.
 * 
 * @returns Object with routes array, loading state, error state, and mutate function
 * 
 * @example
 * ```tsx
 * const { routes, isLoading, isError, mutate } = useRoutes()
 * ```
 */
export function useRoutes() {
  const { data, error, mutate } = useSWR<ApiResponse<Route[]>>(
    '/api/routes',
    (url: string) => fetcher<ApiResponse<Route[]>>(url),
    {
      refreshInterval: ROUTES_REFRESH_INTERVAL,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: (err) => {
        logger.error('[useRoutes] Error fetching routes', {
          error: err instanceof Error ? err.message : String(err),
        })
      },
    }
  )

  if (isDebugMode() && data) {
    logger.debug('[useRoutes] Data updated', {
      routeCount: data.data?.length || 0,
    })
  }

  return {
    routes: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
