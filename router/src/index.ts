/**
 * Application entry point.
 * 
 * This module sets up the HTTP server, loads configuration,
 * and starts the wa2ai router service.
 */

import fastify from 'fastify'
import { registerWebhooks } from './webhooks-controller.js'

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
    console.error('Error starting server:', err)
    process.exit(1)
  }
  console.log(`wa2ai router listening on ${address}`)
})

