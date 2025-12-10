/**
 * Baileys routing setup.
 * 
 * This module sets up direct routing for Baileys messages.
 * It connects BaileysConnectionService with MessageRouter.
 * 
 * This is in the providers layer because it depends on BaileysConnectionService.
 */

import { logger, isDebugMode } from '../core/logger.js'
import type { MessageRouter } from '../core/message-router.js'
import { getBaileysConnection } from './baileys-connection.js'

/**
 * Sets up direct routing for Baileys messages.
 * 
 * This function connects BaileysConnectionService with MessageRouter,
 * creating a complete message flow from WhatsApp to AI agents.
 * 
 * @param messageRouter - The message router instance
 * 
 * @example
 * ```typescript
 * const routerService = new RouterService(routesRepository)
 * const messageRouter = new MessageRouter(routerService, agentClient, { whatsappProvider })
 * setupBaileysDirectRouting(messageRouter)
 * ```
 */
export function setupBaileysDirectRouting(messageRouter: MessageRouter): void {
  if (isDebugMode()) {
    logger.debug('[BaileysRouting] Setting up Baileys direct routing')
  }

  const connection = getBaileysConnection()

  // Register message handler that routes through MessageRouter
  connection.onMessage(async (message) => {
    if (isDebugMode()) {
      logger.debug('[BaileysRouting] Baileys message received', {
        messageId: message.id,
        channelId: message.channelId,
      })
    }

    const result = await messageRouter.routeMessage(message)

    // Response sending is handled by MessageRouter via its configured WhatsApp provider
    return result
  })

  logger.info('[BaileysRouting] Baileys direct routing configured')
}
