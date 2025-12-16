/**
 * Hook for fetching a single route by channelId.
 * 
 * This hook provides reactive data fetching for a single route using SWR.
 * Following Clean Architecture, this is part of the Application Layer.
 * 
 * @module lib/hooks/use-route
 */

'use client'

import useSWR from 'swr'
import { fetcher } from '../api/client'
import type { Route, ApiResponse } from '../types'

/**
 * SWR hook for fetching a single route by channelId.
 * 
 * Does not auto-refresh (only fetches when channelId changes).
 * 
 * @param channelId - Channel ID to fetch
 * @returns Object with route, loading state, and error state
 * 
 * @example
 * ```tsx
 * const { route, isLoading, isError } = useRoute('5493777239922')
 * ```
 */
export function useRoute(channelId: string | null) {
  const { data, error } = useSWR<ApiResponse<Route>>(
    channelId ? `/api/routes/${encodeURIComponent(channelId)}` : null,
    channelId ? (url: string) => fetcher<ApiResponse<Route>>(url) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    route: data?.data || null,
    isLoading: !error && !data && channelId !== null,
    isError: error,
  }
}
