/**
 * Router service - core domain logic for message routing.
 * 
 * This service contains pure business logic with no dependencies
 * on external frameworks or infrastructure.
 */

import type { IncomingMessage, Route } from './models.js'
import { logger, isDebugMode } from './logger.js'

/**
 * Repository interface for route storage.
 * Implementations can use in-memory, JSON files, or databases.
 */
export interface RoutesRepository {
  /**
   * Finds a route by channel ID.
   * 
   * @param channelId - The channel identifier
   * @returns The route if found, null otherwise
   */
  findByChannelId(channelId: string): Promise<Route | null>

  /**
   * Lists all available routes.
   * 
   * @returns Array of all routes
   */
  findAll(): Promise<Route[]>
}

/**
 * Core router service that handles message routing logic.
 */
export class RouterService {
  constructor(private routesRepository: RoutesRepository) {}

  /**
   * Processes an incoming message and determines the target agent.
   * 
   * If no specific route is found for the channelId, looks for a wildcard route ("*")
   * that accepts messages from any origin.
   * 
   * If a route has a regexFilter, the message text must match the regular expression
   * for the route to be selected.
   * 
   * @param message - The incoming message to route
   * @returns The route if found and passes regex filter (if any), null otherwise
   */
  async routeMessage(message: IncomingMessage): Promise<Route | null> {
    // First, try to find a specific route for this channelId
    const specificRoute = await this.routesRepository.findByChannelId(message.channelId)
    if (specificRoute) {
      // Apply regex filter if present
      if (this.matchesRegexFilter(specificRoute, message)) {
        return specificRoute
      }
      // Route found but doesn't match regex filter, continue to wildcard
    }

    // If no specific route found or it didn't match regex, look for a wildcard route ("*")
    const wildcardRoute = await this.routesRepository.findByChannelId('*')
    if (wildcardRoute) {
      // Apply regex filter if present
      if (this.matchesRegexFilter(wildcardRoute, message)) {
        return wildcardRoute
      }
      // Wildcard route found but doesn't match regex filter
    }

    return null
  }

  /**
   * Checks if a message matches the regex filter of a route.
   * 
   * @param route - The route to check
   * @param message - The message to test
   * @returns True if route has no regex filter or if message matches the filter
   */
  private matchesRegexFilter(route: Route, message: IncomingMessage): boolean {
    // If no regex filter, route matches
    if (!route.regexFilter) {
      return true
    }

    try {
      const regex = new RegExp(route.regexFilter)
      const matches = regex.test(message.text)

      if (isDebugMode()) {
        logger.debug('[RouterService] Regex filter applied', {
          channelId: route.channelId,
          regexFilter: route.regexFilter,
          messageText: message.text,
          matches,
        })
      }

      return matches
    } catch (error) {
      // Invalid regex pattern - log error but don't throw
      logger.error('[RouterService] Invalid regex pattern in route', {
        channelId: route.channelId,
        regexFilter: route.regexFilter,
        error: error instanceof Error ? error.message : String(error),
      })
      // Treat invalid regex as non-matching for safety
      return false
    }
  }
}

