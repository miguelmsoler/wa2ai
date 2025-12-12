/**
 * Application entry point.
 * 
 * This module sets up the HTTP server, loads configuration,
 * and starts the wa2ai router service.
 */

import fastify from 'fastify'
import { registerWebhooks } from './webhooks-controller.js'
import { registerRouteEndpoints } from './routes-controller.js'
import { logger, isDebugMode } from './core/logger.js'
import type { WhatsAppProvider } from './core/whatsapp-provider.js'
import { getBaileysConnection } from './providers/baileys-connection.js'
import { BaileysProvider } from './providers/baileys-provider.js'
import { EvolutionProvider } from './providers/evolution-provider.js'
import { PostgresRoutesRepository } from './infra/postgres-routes-repository.js'
import { RouterService } from './core/router-service.js'
import { MessageRouter } from './core/message-router.js'
import { HttpAgentClient } from './infra/http-agent-client.js'
import { setupBaileysDirectRouting } from './providers/baileys-routing.js'

const DEBUG = process.env.WA2AI_DEBUG === 'true'
const PORT = parseInt(process.env.WA2AI_PORT || '3000', 10)
const PROVIDER = (process.env.WA2AI_PROVIDER || 'baileys').toLowerCase()

const server = fastify({
  logger: DEBUG
})

// Webhook endpoints will be registered after routing system is initialized

// Global routes repository instance (accessible for API endpoints)
let globalRoutesRepository: PostgresRoutesRepository | null = null

/**
 * Creates the appropriate WhatsApp provider based on WA2AI_PROVIDER.
 * 
 * Uses the abstract WhatsAppProvider interface, not concrete implementations.
 * 
 * @returns The WhatsApp provider instance or null if not configured
 */
function createWhatsAppProvider(): WhatsAppProvider | null {
  if (PROVIDER === 'baileys') {
    // BaileysProvider handles its own connection configuration internally
    // This keeps index.ts free of provider-specific implementation details
    return new BaileysProvider({
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
  } else if (PROVIDER === 'evolution') {
    return new EvolutionProvider({
      apiUrl: process.env.WA2AI_EVOLUTION_API_URL || 'http://evolution-api-lab:8080',
      apiKey: process.env.WA2AI_EVOLUTION_API_KEY || 'default_key_change_me',
      instanceName: 'wa2ai-lab',
    })
  }
  return null
}

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

  // Create routes repository (PostgreSQL-backed for persistence)
  // Uses default configuration from docker-compose (postgres service)
  globalRoutesRepository = new PostgresRoutesRepository()

  // Create router service
  const routerService = new RouterService(globalRoutesRepository)

  // Create agent client (infrastructure)
  const agentClient = new HttpAgentClient({
    timeout: 30000, // 30 seconds
  })

  // Create WhatsApp provider
  const whatsappProvider = createWhatsAppProvider()

  if (isDebugMode()) {
    logger.debug('[Index] Dependencies created', {
      provider: PROVIDER,
      hasProvider: !!whatsappProvider,
      hasAgentClient: !!agentClient,
    })
  }

  // Create message router with dependencies (whatsappProvider is required)
  if (!whatsappProvider) {
    throw new Error('WhatsApp provider is required for MessageRouter')
  }

  const messageRouter = new MessageRouter(
    routerService,
    agentClient,
    {
      whatsappProvider,
    }
  )

  // Register route management endpoints BEFORE server starts listening
  if (globalRoutesRepository) {
    registerRouteEndpoints(server, globalRoutesRepository)
    if (DEBUG) {
      logger.debug('[Index] Route management endpoints registered')
    }
  }

  // Routes are now persisted in PostgreSQL database
  // Routes can be added via API endpoints and will persist across container restarts

  logger.info('[Index] Routing system initialized', {
    routeCount: globalRoutesRepository.getRouteCount(),
  })

  // Register webhook endpoints with dependencies
  if (whatsappProvider) {
    registerWebhooks(server, {
      messageRouter,
      whatsappProvider,
    })
    if (DEBUG) {
      logger.debug('[Index] Webhook endpoints registered with dependencies')
    }
  } else {
    logger.warn('[Index] WhatsApp provider not available - webhook endpoints not registered')
  }

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
  // Get the already-configured connection (created in createWhatsAppProvider)
  const connection = getBaileysConnection()

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
    provider: PROVIDER,
  })

  // Initialize provider based on WA2AI_PROVIDER environment variable
  if (PROVIDER === 'baileys') {
    await initializeBaileysConnection(messageRouter)
  } else if (PROVIDER === 'evolution') {
    logger.info('Evolution API provider selected - webhook endpoints available at /webhooks/whatsapp/lab')
    // Evolution API uses webhooks, no direct connection needed
    // Messages will be received via webhook endpoints registered in registerWebhooks
  } else {
    logger.warn(`Unknown provider: ${PROVIDER}. Valid options: 'baileys' or 'evolution'. Defaulting to 'baileys'.`)
    await initializeBaileysConnection(messageRouter)
  }
})

