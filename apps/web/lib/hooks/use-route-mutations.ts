/**
 * Hooks for route mutations (create, update, delete).
 * 
 * This module provides hooks for mutating routes (creating, updating, deleting).
 * Following Clean Architecture, this is part of the Application Layer.
 * 
 * @module lib/hooks/use-route-mutations
 */

'use client'

import { useCallback } from 'react'
import { createRoute, updateRoute, deleteRoute } from '../api/routes'
import { logger, isDebugMode } from '../utils/logger'
import type { Route, ApiResponse } from '../types'

/**
 * Hook for deleting a route.
 * 
 * Returns a function that deletes a route by channelId.
 * 
 * @returns Function to delete a route
 * 
 * @example
 * ```tsx
 * const deleteRoute = useDeleteRoute()
 * 
 * const handleDelete = async () => {
 *   try {
 *     await deleteRoute('5493777239922')
 *     // Route deleted successfully
 *   } catch (error) {
 *     // Handle error
 *   }
 * }
 * ```
 */
export function useDeleteRoute() {
  return useCallback(async (channelId: string): Promise<void> => {
    if (isDebugMode()) {
      logger.debug('[useDeleteRoute] Deleting route', { channelId })
    }

    try {
      await deleteRoute(channelId)
      logger.info('[useDeleteRoute] Route deleted successfully', { channelId })
    } catch (error) {
      logger.error('[useDeleteRoute] Failed to delete route', {
        channelId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }, [])
}

/**
 * Hook for creating a route.
 * 
 * Returns a function that creates a new route.
 * 
 * @returns Function to create a route
 * 
 * @example
 * ```tsx
 * const createRoute = useCreateRoute()
 * 
 * const handleCreate = async () => {
 *   try {
 *     const result = await createRoute({
 *       channelId: '5493777239922',
 *       agentEndpoint: 'http://localhost:8000',
 *       environment: 'lab',
 *     })
 *     // Route created successfully
 *   } catch (error) {
 *     // Handle error
 *   }
 * }
 * ```
 */
export function useCreateRoute() {
  return useCallback(async (route: Route): Promise<ApiResponse<Route>> => {
    if (isDebugMode()) {
      logger.debug('[useCreateRoute] Creating route', {
        channelId: route.channelId,
        agentEndpoint: route.agentEndpoint,
      })
    }

    try {
      const result = await createRoute(route)
      logger.info('[useCreateRoute] Route created successfully', {
        channelId: route.channelId,
      })
      return result
    } catch (error) {
      logger.error('[useCreateRoute] Failed to create route', {
        channelId: route.channelId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }, [])
}

/**
 * Hook for updating a route.
 * 
 * Returns a function that updates an existing route.
 * 
 * @returns Function to update a route
 * 
 * @example
 * ```tsx
 * const updateRoute = useUpdateRoute()
 * 
 * const handleUpdate = async () => {
 *   try {
 *     const result = await updateRoute('5493777239922', {
 *       channelId: '5493777239922',
 *       agentEndpoint: 'http://localhost:8001',
 *       environment: 'prod',
 *     })
 *     // Route updated successfully
 *   } catch (error) {
 *     // Handle error
 *   }
 * }
 * ```
 */
export function useUpdateRoute() {
  return useCallback(
    async (channelId: string, route: Route): Promise<ApiResponse<Route>> => {
      if (isDebugMode()) {
        logger.debug('[useUpdateRoute] Updating route', {
          channelId,
          agentEndpoint: route.agentEndpoint,
        })
      }

      try {
        const result = await updateRoute(channelId, route)
        logger.info('[useUpdateRoute] Route updated successfully', { channelId })
        return result
      } catch (error) {
        logger.error('[useUpdateRoute] Failed to update route', {
          channelId,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    },
    []
  )
}
