/**
 * Webhooks controller - HTTP entry points for incoming webhooks.
 * 
 * This module handles HTTP requests from WhatsApp providers and
 * coordinates the routing flow.
 */

import type { FastifyInstance } from 'fastify'

/**
 * Gets the DEBUG flag from environment variable.
 * Should be checked at runtime, not at module load time.
 */
function isDebugMode(): boolean {
  return process.env.WA2AI_DEBUG === 'true'
}

/**
 * Registers webhook endpoints on the FastAPI instance.
 * 
 * @param app - Fastify application instance
 */
export function registerWebhooks(app: FastifyInstance): void {
  app.post('/webhooks/whatsapp/lab', async (request, reply) => {
    const body = request.body as any
    
    // Always log webhook events for validation
    // Evolution API sends webhooks in format: { event: "messages.upsert", instance: "...", data: {...} }
    const eventType = body?.event || (body?.event?.event)
    const instance = body?.instance || body?.event?.instance
    const data = body?.data || body?.event?.data
    
    if (eventType) {
      console.log(`[Webhook] Received event: ${eventType} from instance: ${instance || 'unknown'}`)
      
      // Log message details if it's a messages.upsert event
      // Evolution API sends data as a single message object (messageRaw), not an array
      if (eventType === 'messages.upsert' && data) {
        // data is the message object directly (from prepareMessage)
        const msg = data
        const from = msg.key?.remoteJid || msg.from || 'unknown'
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text ||
                          msg.message?.imageMessage?.caption ||
                          '[media or unsupported message type]'
        console.log(`[Webhook] Message received from ${from}: ${messageText}`)
      }
      
      // In debug mode, log full payload
      if (isDebugMode()) {
        console.log('[Webhook] Full payload:', JSON.stringify(body, null, 2))
      }
    } else {
      console.log('[Webhook] Received webhook with unknown format:', body)
    }
    
    // TODO: Parse and route message to appropriate agent
    // This will be implemented in Phase 1
    
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

