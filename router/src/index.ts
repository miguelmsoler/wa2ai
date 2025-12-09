/**
 * Application entry point.
 * 
 * This module sets up the HTTP server, loads configuration,
 * and starts the wa2ai router service.
 */

import fastify from 'fastify'
import { registerWebhooks } from './webhooks-controller.js'
import { logger } from './core/logger.js'

const DEBUG = process.env.WA2AI_DEBUG === 'true'
const PORT = parseInt(process.env.WA2AI_PORT || '3000', 10)

const server = fastify({
  logger: DEBUG
})

// Register webhook endpoints
registerWebhooks(server)

// Start server
server.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    logger.critical('Error starting server', {
      error: err instanceof Error ? err.message : String(err),
      port: PORT,
    })
    process.exit(1)
  }
  logger.info('wa2ai router started', {
    address,
    port: PORT,
    debugMode: DEBUG,
  })
})

