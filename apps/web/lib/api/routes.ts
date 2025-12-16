/**
 * Routes API client.
 * 
 * This module provides functions for interacting with the routes API endpoint.
 * Following Clean Architecture, this is part of the Infrastructure Layer.
 * 
 * @module lib/api/routes
 */

import { mutator } from './client'
import { logger, isDebugMode } from '../utils/logger'
import type { Route, ApiResponse } from '../types'

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
  if (isDebugMode()) {
    logger.debug('[RoutesApi] Creating route', {
      channelId: route.channelId,
      agentEndpoint: route.agentEndpoint,
    })
  }

  try {
    const result = await mutator<Route>('/api/routes', 'POST', route)
    logger.info('[RoutesApi] Route created successfully', {
      channelId: route.channelId,
    })
    return result
  } catch (error) {
    logger.error('[RoutesApi] Failed to create route', {
      channelId: route.channelId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
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
  if (isDebugMode()) {
    logger.debug('[RoutesApi] Updating route', {
      channelId,
      agentEndpoint: route.agentEndpoint,
    })
  }

  try {
    const result = await mutator<Route>(
      `/api/routes/${encodeURIComponent(channelId)}`,
      'PUT',
      route
    )
    logger.info('[RoutesApi] Route updated successfully', { channelId })
    return result
  } catch (error) {
    logger.error('[RoutesApi] Failed to update route', {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
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
  if (isDebugMode()) {
    logger.debug('[RoutesApi] Deleting route', { channelId })
  }

  try {
    await mutator(`/api/routes/${encodeURIComponent(channelId)}`, 'DELETE')
    logger.info('[RoutesApi] Route deleted successfully', { channelId })
  } catch (error) {
    logger.error('[RoutesApi] Failed to delete route', {
      channelId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
