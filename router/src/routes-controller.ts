/**
 * Routes controller - HTTP endpoints for route management.
 * 
 * This module handles HTTP requests for managing routing rules.
 * It only handles HTTP concerns (parsing request, sending response).
 * Business logic is delegated to domain services (RoutesRepository).
 */

import type { FastifyInstance } from 'fastify'
import { logger, isDebugMode } from './core/logger.js'
import type { Route } from './core/models.js'
import type { InMemoryRoutesRepository } from './core/routes-repository.js'

/**
 * Registers route management endpoints on the Fastify instance.
 * 
 * These endpoints allow managing routing rules via HTTP API:
 * - POST /api/routes - Add a new route
 * - GET /api/routes - List all routes
 * - GET /api/routes/:channelId - Get a specific route
 * - DELETE /api/routes/:channelId - Remove a route
 * 
 * @param app - Fastify application instance
 * @param routesRepository - Routes repository instance (must be InMemoryRoutesRepository for addRoute/removeRoute)
 */
export function registerRouteEndpoints(
  app: FastifyInstance,
  routesRepository: InMemoryRoutesRepository
): void {
  /**
   * POST /api/routes - Add a new route.
   * 
   * Body: { channelId, agentEndpoint, environment, regexFilter?, config? }
   */
  app.post<{ Body: Route }>('/api/routes', async (request, reply) => {
    if (isDebugMode()) {
      logger.debug('[RoutesController] Adding route', {
        channelId: request.body.channelId,
        agentEndpoint: request.body.agentEndpoint,
        hasRegexFilter: !!request.body.regexFilter,
      })
    }

    try {
      await routesRepository.addRoute(request.body)

      logger.info('[RoutesController] Route added via API', {
        channelId: request.body.channelId,
        agentEndpoint: request.body.agentEndpoint,
        environment: request.body.environment,
        hasRegexFilter: !!request.body.regexFilter,
      })

      reply.code(201).send({
        success: true,
        message: 'Route added successfully',
        route: request.body,
      })
    } catch (error) {
      logger.error('[RoutesController] Failed to add route', {
        error: error instanceof Error ? error.message : String(error),
        channelId: request.body.channelId,
      })

      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  /**
   * GET /api/routes - List all routes.
   */
  app.get('/api/routes', async (_request, reply) => {
    if (isDebugMode()) {
      logger.debug('[RoutesController] Listing all routes')
    }

    try {
      const routes = await routesRepository.findAll()

      logger.info('[RoutesController] Routes listed via API', {
        count: routes.length,
      })

      reply.code(200).send({
        success: true,
        routes,
        count: routes.length,
      })
    } catch (error) {
      logger.error('[RoutesController] Failed to list routes', {
        error: error instanceof Error ? error.message : String(error),
      })

      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  /**
   * GET /api/routes/:channelId - Get a specific route.
   */
  app.get<{ Params: { channelId: string } }>('/api/routes/:channelId', async (request, reply) => {
    const { channelId } = request.params

    if (isDebugMode()) {
      logger.debug('[RoutesController] Getting route', { channelId })
    }

    try {
      const route = await routesRepository.findByChannelId(channelId)

      if (!route) {
        reply.code(404).send({
          success: false,
          error: `Route not found for channel: ${channelId}`,
        })
        return
      }

      reply.code(200).send({
        success: true,
        route,
      })
    } catch (error) {
      logger.error('[RoutesController] Failed to get route', {
        error: error instanceof Error ? error.message : String(error),
        channelId,
      })

      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })

  /**
   * DELETE /api/routes/:channelId - Remove a route.
   */
  app.delete<{ Params: { channelId: string } }>('/api/routes/:channelId', async (request, reply) => {
    const { channelId } = request.params

    if (isDebugMode()) {
      logger.debug('[RoutesController] Removing route', { channelId })
    }

    try {
      const removed = await routesRepository.removeRoute(channelId)

      if (!removed) {
        reply.code(404).send({
          success: false,
          error: `Route not found for channel: ${channelId}`,
        })
        return
      }

      logger.info('[RoutesController] Route removed via API', { channelId })

      reply.code(200).send({
        success: true,
        message: 'Route removed successfully',
      })
    } catch (error) {
      logger.error('[RoutesController] Failed to remove route', {
        error: error instanceof Error ? error.message : String(error),
        channelId,
      })

      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  })
}
