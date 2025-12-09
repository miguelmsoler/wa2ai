/**
 * Webhooks controller - HTTP entry points for incoming webhooks.
 * 
 * This module handles HTTP requests from WhatsApp providers.
 * It only handles HTTP concerns (parsing request, sending response).
 * Business logic is delegated to domain services.
 */

import type { FastifyInstance } from 'fastify'
import { logger } from './core/logger.js'
import { normalizeEvolutionApiWebhook } from './core/webhook-adapter.js'

/**
 * Registers webhook endpoints on the Fastify instance.
 * 
 * @param app - Fastify application instance
 */
export function registerWebhooks(app: FastifyInstance): void {
  app.post('/webhooks/whatsapp/lab', async (request, reply) => {
    const body = request.body as unknown
    
    // Log incoming webhook
    logger.debug('[WebhookController] Received webhook', {
      body,
    })
    
    // Delegate normalization to domain adapter
    const normalizedMessage = normalizeEvolutionApiWebhook(body)
    
    if (normalizedMessage) {
      // TODO: Route message to appropriate agent via RouterService
      // This will be implemented in Phase 1
      // const route = await routerService.routeMessage(normalizedMessage)
      // await processMessage(normalizedMessage, route)
      
      logger.info('[WebhookController] Message processed', {
        messageId: normalizedMessage.id,
        channelId: normalizedMessage.channelId,
      })
    }
    
    reply.code(200).send({ status: 'ok', received: true })
  })

  app.post('/webhooks/whatsapp/prod', async (_request, reply) => {
    // TODO: Handle WhatsApp Cloud API webhook (Phase 2)
    reply.code(200).send({ status: 'ok' })
  })

  app.get('/health', async (_request, reply) => {
    reply.code(200).send({ status: 'healthy' })
  })
}

