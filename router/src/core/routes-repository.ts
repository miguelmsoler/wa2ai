/**
 * Routes repository implementation.
 * 
 * This module provides implementations of RoutesRepository for storing
 * and retrieving routing rules. Following Clean Architecture, this is
 * an infrastructure concern that implements the core interface.
 * 
 * @module core/routes-repository
 */

import type { Route } from './models.js'
import type { RoutesRepository } from './router-service.js'
import { logger, isDebugMode } from './logger.js'

/**
 * In-memory implementation of RoutesRepository.
 * 
 * This is suitable for development and testing. For production,
 * consider implementing a database-backed repository.
 * 
 * @example
 * ```typescript
 * const repository = new InMemoryRoutesRepository()
 * await repository.addRoute({
 *   channelId: '5491155551234',
 *   agentEndpoint: 'http://localhost:8000/agent',
 *   environment: 'lab'
 * })
 * const route = await repository.findByChannelId('5491155551234')
 * ```
 */
export class InMemoryRoutesRepository implements RoutesRepository {
  private routes: Map<string, Route> = new Map()

  /**
   * Finds a route by channel ID.
   * 
   * @param channelId - The channel identifier
   * @returns Promise resolving to the route if found, null otherwise
   */
  async findByChannelId(channelId: string): Promise<Route | null> {
    if (isDebugMode()) {
      logger.debug('[InMemoryRoutesRepository] Finding route', {
        channelId,
        totalRoutes: this.routes.size,
      })
    }

    const route = this.routes.get(channelId) || null

    if (route) {
      logger.info('[InMemoryRoutesRepository] Route found', {
        channelId,
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
      })
    } else {
      if (isDebugMode()) {
        logger.debug('[InMemoryRoutesRepository] Route not found', { channelId })
      }
    }

    return route
  }

  /**
   * Lists all available routes.
   * 
   * @returns Promise resolving to array of all routes
   */
  async findAll(): Promise<Route[]> {
    if (isDebugMode()) {
      logger.debug('[InMemoryRoutesRepository] Finding all routes', {
        count: this.routes.size,
      })
    }

    return Array.from(this.routes.values())
  }

  /**
   * Adds a route to the repository.
   * 
   * This is a convenience method for populating the repository.
   * 
   * @param route - The route to add
   * @returns Promise that resolves when the route is added
   */
  async addRoute(route: Route): Promise<void> {
    if (isDebugMode()) {
      logger.debug('[InMemoryRoutesRepository] Adding route', {
        channelId: route.channelId,
        agentEndpoint: route.agentEndpoint,
      })
    }

    this.routes.set(route.channelId, route)

    logger.info('[InMemoryRoutesRepository] Route added', {
      channelId: route.channelId,
      agentEndpoint: route.agentEndpoint,
      environment: route.environment,
    })
  }

  /**
   * Removes a route from the repository.
   * 
   * @param channelId - The channel ID of the route to remove
   * @returns Promise that resolves to true if route was removed, false otherwise
   */
  async removeRoute(channelId: string): Promise<boolean> {
    if (isDebugMode()) {
      logger.debug('[InMemoryRoutesRepository] Removing route', { channelId })
    }

    const existed = this.routes.has(channelId)
    this.routes.delete(channelId)

    if (existed) {
      logger.info('[InMemoryRoutesRepository] Route removed', { channelId })
    } else {
      if (isDebugMode()) {
        logger.debug('[InMemoryRoutesRepository] Route not found for removal', { channelId })
      }
    }

    return existed
  }

  /**
   * Clears all routes from the repository.
   * 
   * @returns Promise that resolves when all routes are cleared
   */
  async clear(): Promise<void> {
    const count = this.routes.size
    this.routes.clear()

    logger.info('[InMemoryRoutesRepository] All routes cleared', { count })
  }

  /**
   * Gets the number of routes in the repository.
   * 
   * @returns The number of routes
   */
  getRouteCount(): number {
    return this.routes.size
  }
}

