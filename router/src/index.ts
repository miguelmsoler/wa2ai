/**
 * Application entry point.
 * 
 * This module sets up the HTTP server, loads configuration,
 * and starts the wa2ai router service.
 */

import fastify from 'fastify'
import { registerWebhooks } from './webhooks-controller.js'
import { registerRouteEndpoints } from './routes-controller.js'
import { logger } from './core/logger.js'
import { getBaileysConnection } from './providers/baileys-connection.js'
import { InMemoryRoutesRepository } from './core/routes-repository.js'
import { RouterService } from './core/router-service.js'
import { MessageRouter, setupBaileysDirectRouting } from './core/message-router.js'

const DEBUG = process.env.WA2AI_DEBUG === 'true'
const PORT = parseInt(process.env.WA2AI_PORT || '3000', 10)

const server = fastify({
  logger: DEBUG
})

// Register basic webhook endpoints
registerWebhooks(server)

// Global routes repository instance (accessible for API endpoints)
let globalRoutesRepository: InMemoryRoutesRepository | null = null

/**
 * Initializes the routing system.
 * 
 * Sets up routes repository, router service, and message router.
 * 
 * @returns The message router instance
 */
function initializeRouting(): MessageRouter {
  if (DEBUG) {
    logger.debug('[Index] Initializing routing system')
  }

  // Create routes repository (in-memory for now)
  globalRoutesRepository = new InMemoryRoutesRepository()

  // Create router service
  const routerService = new RouterService(globalRoutesRepository)

  // Create message router
  const messageRouter = new MessageRouter(routerService, {
    agentClient: {
      timeout: 30000, // 30 seconds
    },
  })

  // Register route management endpoints BEFORE server starts listening
  if (globalRoutesRepository) {
    registerRouteEndpoints(server, globalRoutesRepository)
    if (DEBUG) {
      logger.debug('[Index] Route management endpoints registered')
    }
  }

  // TODO: Load routes from configuration file or database
  // For now, routes can be added programmatically or via API endpoints

  logger.info('[Index] Routing system initialized', {
    routeCount: globalRoutesRepository.getRouteCount(),
  })

  return messageRouter
}

/**
 * Initializes the Baileys WhatsApp connection with direct routing.
 * 
 * This starts the connection process in the background and sets up
 * message routing to AI agents.
 * QR code will be available at /qr endpoint once generated.
 */
async function initializeBaileysConnection(messageRouter: MessageRouter): Promise<void> {
  const connection = getBaileysConnection({
    authDir: process.env.WA2AI_BAILEYS_AUTH_DIR || './auth_info_baileys',
    printQRInTerminal: DEBUG,
    // Allow messages from self (fromMe:true) for testing purposes
    messageFilter: {
      ignoreFromMe: false,
      ignoreGroups: false,
      ignoreStatusBroadcast: true,
      ignoreJids: [],
    },
  })

  try {
    await connection.connect()
    
    // Set up direct routing
    setupBaileysDirectRouting(messageRouter)

    logger.info('Baileys connection initiated with direct routing', {
      qrEndpoint: `http://localhost:${PORT}/qr`,
    })
  } catch (error) {
    logger.error('Failed to initialize Baileys connection', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Don't exit - server can still run and retry connection later
  }
}

// Initialize routing system BEFORE server starts listening
const messageRouter = initializeRouting()

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

  // Initialize Baileys connection with direct routing after server starts
  await initializeBaileysConnection(messageRouter)
})

