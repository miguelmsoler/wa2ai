/**
 * API client with SWR hooks for data fetching and mutation functions.
 * 
 * This module provides:
 * - SWR hooks for reactive data fetching with automatic revalidation
 * - Mutation functions for creating, updating, and deleting routes
 * - Utility functions for QR code image URLs
 * - Centralized error handling
 */

'use client'

import useSWR from 'swr'
import type { Route, ConnectionState, ApiResponse, ApiError } from './types'

/**
 * Base API URL from environment variable.
 * Defaults to http://localhost:3000 if not set.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Refresh intervals from environment variables (in milliseconds).
 */
const QR_REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_QR_REFRESH_INTERVAL || '3000',
  10
)
const STATUS_REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_STATUS_REFRESH_INTERVAL || '5000',
  10
)
const ROUTES_REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_ROUTES_REFRESH_INTERVAL || '10000',
  10
)

/**
 * Generic fetcher function for SWR.
 * 
 * Handles HTTP requests and error parsing.
 * 
 * @param url - API endpoint path (relative to API_URL)
 * @returns Promise with parsed JSON response
 * @throws {ApiError} If the request fails
 */
async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(`${API_URL}${url}`)
  
  if (!response.ok) {
    const error: ApiError = new Error('API request failed') as ApiError
    error.status = response.status
    
    try {
      const errorData = await response.json() as ApiResponse<unknown>
      error.info = errorData
      error.message = errorData.error || `HTTP ${response.status}: ${response.statusText}`
      error.code = errorData.code
      error.details = errorData.details
    } catch {
      // If response is not JSON, use status text
      error.message = `HTTP ${response.status}: ${response.statusText}`
    }
    
    throw error
  }
  
  return response.json() as Promise<T>
}

/**
 * Generic mutator function for POST/PUT requests.
 * 
 * @param url - API endpoint path
 * @param method - HTTP method (POST, PUT, DELETE)
 * @param body - Request body (optional)
 * @returns Promise with parsed JSON response
 * @throws {ApiError} If the request fails
 */
async function mutator(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<ApiResponse<Route>> {
  const response = await fetch(`${API_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  
  if (!response.ok) {
    const error: ApiError = new Error('API request failed') as ApiError
    error.status = response.status
    
    try {
      const errorData = await response.json() as ApiResponse<unknown>
      error.info = errorData
      error.message = errorData.error || `HTTP ${response.status}: ${response.statusText}`
      error.code = errorData.code
      error.details = errorData.details
    } catch {
      error.message = `HTTP ${response.status}: ${response.statusText}`
    }
    
    throw error
  }
  
  // Handle 204 No Content responses
  if (response.status === 204) {
    return { success: true }
  }
  
  return response.json() as Promise<ApiResponse<Route>>
}

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
    }
  )

  return {
    routes: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}

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
    }
  )

  return {
    status: data?.status || 'disconnected',
    connected: data?.connected || false,
    qrAvailable: data?.qrAvailable || false,
    error: data?.error,
    isLoading: !error && !data,
  }
}

/**
 * Creates a new route.
 * 
 * @param route - Route data to create
 * @returns Promise resolving to API response with created route
 * @throws {ApiError} If creation fails (validation error, server error, etc.)
 * 
 * @example
 * ```tsx
 * try {
 *   const response = await createRoute({
 *     channelId: '5493777239922',
 *     agentEndpoint: 'http://localhost:8000',
 *     environment: 'lab',
 *     config: { adk: { appName: 'my_agent' } }
 *   })
 *   console.log('Route created:', response.data)
 * } catch (error) {
 *   console.error('Failed to create route:', error.message)
 * }
 * ```
 */
export async function createRoute(route: Route): Promise<ApiResponse<Route>> {
  return mutator('/api/routes', 'POST', route)
}

/**
 * Updates an existing route.
 * 
 * @param channelId - Channel ID of the route to update
 * @param route - Updated route data
 * @returns Promise resolving to API response with updated route
 * @throws {ApiError} If update fails (route not found, validation error, etc.)
 * 
 * @example
 * ```tsx
 * try {
 *   const response = await updateRoute('5493777239922', {
 *     channelId: '5493777239922',
 *     agentEndpoint: 'http://localhost:8001',
 *     environment: 'prod',
 *     regexFilter: '^Test.*'
 *   })
 *   console.log('Route updated:', response.data)
 * } catch (error) {
 *   console.error('Failed to update route:', error.message)
 * }
 * ```
 */
export async function updateRoute(
  channelId: string,
  route: Route
): Promise<ApiResponse<Route>> {
  return mutator(`/api/routes/${encodeURIComponent(channelId)}`, 'PUT', route)
}

/**
 * Deletes a route.
 * 
 * @param channelId - Channel ID of the route to delete
 * @returns Promise resolving when deletion is complete
 * @throws {ApiError} If deletion fails (route not found, server error, etc.)
 * 
 * @example
 * ```tsx
 * try {
 *   await deleteRoute('5493777239922')
 *   console.log('Route deleted successfully')
 * } catch (error) {
 *   console.error('Failed to delete route:', error.message)
 * }
 * ```
 */
export async function deleteRoute(channelId: string): Promise<void> {
  await mutator(`/api/routes/${encodeURIComponent(channelId)}`, 'DELETE')
}

/**
 * Gets the URL for the QR code image with cache busting.
 * 
 * @returns URL string for the QR code image endpoint
 * 
 * @example
 * ```tsx
 * const qrUrl = getQRImageUrl()
 * <img src={qrUrl} alt="QR Code" />
 * ```
 */
export function getQRImageUrl(): string {
  return `${API_URL}/qr/image?t=${Date.now()}`
}
