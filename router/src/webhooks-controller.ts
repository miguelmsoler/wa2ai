/**
 * Webhooks controller - HTTP entry points for incoming webhooks.
 * 
 * This module handles HTTP requests from WhatsApp providers and
 * coordinates the routing flow.
 */

import type { FastifyInstance } from 'fastify'

/**
 * Registers webhook endpoints on the FastAPI instance.
 * 
 * @param app - Fastify application instance
 */
export function registerWebhooks(app: FastifyInstance): void {
  // TODO: Implement webhook endpoints
  // This will be implemented in Phase 1
  
  app.post('/webhooks/whatsapp/lab', async (_request, reply) => {
    // TODO: Handle Evolution API webhook
    reply.code(200).send({ status: 'ok' })
  })

  app.post('/webhooks/whatsapp/prod', async (_request, reply) => {
    // TODO: Handle WhatsApp Cloud API webhook (Phase 2)
    reply.code(200).send({ status: 'ok' })
  })

  app.get('/health', async (_request, reply) => {
    reply.code(200).send({ status: 'healthy' })
  })
}

