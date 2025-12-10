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
import type { MutableRoutesRepository } from './core/router-service.js'

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
 * @param routesRepository - Routes repository instance (must implement MutableRoutesRepository for addRoute/removeRoute)
 */
export function registerRouteEndpoints(
  app: FastifyInstance,
  routesRepository: MutableRoutesRepository
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
        data: request.body,
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
        data: routes,
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
        data: route,
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
   * PUT /api/routes/:channelId - Update an existing route.
   * 
   * Body: { channelId?, agentEndpoint, environment, regexFilter?, config? }
   * If channelId is provided in body, it will change the route's channelId (effectively moving it)
   */
  app.put<{ Params: { channelId: string }; Body: Route }>('/api/routes/:channelId', async (request, reply) => {
    const { channelId: oldChannelId } = request.params
    const newChannelId = request.body.channelId || oldChannelId

    if (isDebugMode()) {
      logger.debug('[RoutesController] Updating route', {
        oldChannelId,
        newChannelId,
        agentEndpoint: request.body.agentEndpoint,
      })
    }

    try {
      // Check if route exists
      const existingRoute = await routesRepository.findByChannelId(oldChannelId)
      if (!existingRoute) {
        // If route doesn't exist, create it (upsert behavior)
        const newRoute: Route = {
          channelId: newChannelId,
          agentEndpoint: request.body.agentEndpoint,
          environment: request.body.environment,
          regexFilter: request.body.regexFilter,
          config: request.body.config,
        }
        await routesRepository.addRoute(newRoute)

        logger.info('[RoutesController] Route created via PUT (upsert)', {
          channelId: newChannelId,
          agentEndpoint: newRoute.agentEndpoint,
        })

        reply.code(201).send({
          success: true,
          message: 'Route created successfully',
          data: newRoute,
        })
        return
      }

      // Create updated route
      const updatedRoute: Route = {
        channelId: newChannelId,
        agentEndpoint: request.body.agentEndpoint,
        environment: request.body.environment,
        regexFilter: request.body.regexFilter,
        config: request.body.config,
      }

      // Remove old route and add updated one (even if channelId changed)
      await routesRepository.removeRoute(oldChannelId)
      await routesRepository.addRoute(updatedRoute)

      logger.info('[RoutesController] Route updated via API', {
        oldChannelId,
        newChannelId,
        agentEndpoint: updatedRoute.agentEndpoint,
        environment: updatedRoute.environment,
        hasRegexFilter: !!updatedRoute.regexFilter,
      })

      reply.code(200).send({
        success: true,
        message: 'Route updated successfully',
        data: updatedRoute,
      })
    } catch (error) {
      logger.error('[RoutesController] Failed to update route', {
        error: error instanceof Error ? error.message : String(error),
        oldChannelId,
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

      reply.code(204).send()
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
