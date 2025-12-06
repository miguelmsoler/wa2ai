/**
 * Router service - core domain logic for message routing.
 * 
 * This service contains pure business logic with no dependencies
 * on external frameworks or infrastructure.
 */

import type { IncomingMessage, Route } from './models.js'

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
   * @param message - The incoming message to route
   * @returns The route if found, null otherwise
   */
  async routeMessage(message: IncomingMessage): Promise<Route | null> {
    return await this.routesRepository.findByChannelId(message.channelId)
  }
}

