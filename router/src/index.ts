/**
 * Application entry point.
 * 
 * This module sets up the HTTP server, loads configuration,
 * and starts the wa2ai router service.
 */

import fastify from 'fastify'
import { registerWebhooks } from './webhooks-controller.js'
import { logger } from './core/logger.js'
import { getBaileysConnection } from './providers/baileys-connection.js'

const DEBUG = process.env.WA2AI_DEBUG === 'true'
const PORT = parseInt(process.env.WA2AI_PORT || '3000', 10)

const server = fastify({
  logger: DEBUG
})

// Register webhook endpoints
registerWebhooks(server)

/**
 * Initializes the Baileys WhatsApp connection.
 * 
 * This starts the connection process in the background.
 * QR code will be available at /qr endpoint once generated.
 */
async function initializeBaileysConnection(): Promise<void> {
  const connection = getBaileysConnection({
    authDir: process.env.WA2AI_BAILEYS_AUTH_DIR || './auth_info_baileys',
    printQRInTerminal: DEBUG,
  })

  try {
    await connection.connect()
    logger.info('Baileys connection initiated', {
      qrEndpoint: `http://localhost:${PORT}/qr`,
    })
  } catch (error) {
    logger.error('Failed to initialize Baileys connection', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Don't exit - server can still run and retry connection later
  }
}

// Start server
server.listen({ port: PORT, host: '0.0.0.0' }, async (err, address) => {
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

  // Initialize Baileys connection after server starts
  await initializeBaileysConnection()
})

