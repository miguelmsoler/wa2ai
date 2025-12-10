/**
 * Message router - application service for routing messages.
 * 
 * This module coordinates the routing of messages from WhatsApp providers
 * to AI agents. It combines RouterService (finding routes) with AgentClient
 * (sending to agents) and handles the complete flow.
 * 
 * Following Clean Architecture, this is an application service that
 * orchestrates domain services and infrastructure.
 * 
 * @module core/message-router
 */

import type { IncomingMessage } from './models.js'
import type { MessageHandlerResult } from './message-handler.js'
import { RouterService } from './router-service.js'
import { AgentClient } from './agent-client.js'
import { logger, isDebugMode } from './logger.js'
import { getBaileysConnection } from '../providers/baileys-connection.js'

/**
 * Configuration for message router.
 */
export interface MessageRouterConfig {
  /** Agent client configuration */
  agentClient?: {
    timeout?: number
    headers?: Record<string, string>
  }
}

/**
 * Service that routes incoming messages to appropriate AI agents.
 * 
 * This service handles the complete flow:
 * 1. Receives incoming message
 * 2. Finds route using RouterService
 * 3. Sends message to agent endpoint
 * 4. Handles agent response (if any)
 * 5. Returns result for sending back to user
 * 
 * @example
 * ```typescript
 * const routerService = new RouterService(routesRepository)
 * const messageRouter = new MessageRouter(routerService)
 * 
 * const result = await messageRouter.routeMessage(incomingMessage)
 * if (result.success && result.response) {
 *   // Send response back via WhatsApp
 * }
 * ```
 */
export class MessageRouter {
  private agentClient: AgentClient

  constructor(
    private routerService: RouterService,
    config: MessageRouterConfig = {}
  ) {
    this.agentClient = new AgentClient(config.agentClient)

    if (isDebugMode()) {
      logger.debug('[MessageRouter] Initialized', {
        hasRouterService: !!routerService,
      })
    }
  }

  /**
   * Routes an incoming message to the appropriate agent.
   * 
   * This method:
   * 1. Finds the route for the message's channel
   * 2. Sends the message to the agent endpoint
   * 3. Returns the agent's response
   * 
   * @param message - The incoming message to route
   * @returns Promise resolving to the handler result
   */
  async routeMessage(message: IncomingMessage): Promise<MessageHandlerResult> {
    if (isDebugMode()) {
      logger.debug('[MessageRouter] Routing message', {
        messageId: message.id,
        channelId: message.channelId,
        from: message.from,
      })
    }

    // Step 1: Find route
    const route = await this.routerService.routeMessage(message)

    if (!route) {
      // Log complete message information when DEBUG is enabled
      if (isDebugMode()) {
        logger.debug('[MessageRouter] No route found - complete message details', {
          messageId: message.id,
          from: message.from,
          channelId: message.channelId,
          text: message.text,
          timestamp: message.timestamp.toISOString(),
          metadata: message.metadata,
        })
      }

      logger.warn('[MessageRouter] No route found for message', {
        messageId: message.id,
        channelId: message.channelId,
        from: message.from,
      })

      return {
        success: false,
        error: `No route found for channel: ${message.channelId}`,
      }
    }

    if (isDebugMode()) {
      logger.debug('[MessageRouter] Route found - complete message details', {
        messageId: message.id,
        from: message.from,
        channelId: message.channelId,
        text: message.text,
        timestamp: message.timestamp.toISOString(),
        metadata: message.metadata,
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
      })
    }

    // Step 2: Send to agent
    try {
      const agentResponse = await this.agentClient.sendMessage(
        route.agentEndpoint,
        message
      )

      if (isDebugMode()) {
        logger.debug('[MessageRouter] Agent response', {
          messageId: message.id,
          success: agentResponse.success,
          hasResponse: !!agentResponse.response,
        })
      }

      if (!agentResponse.success) {
        logger.warn('[MessageRouter] Agent returned error', {
          messageId: message.id,
          agentEndpoint: route.agentEndpoint,
          error: agentResponse.error,
        })

        return {
          success: false,
          error: agentResponse.error || 'Agent processing failed',
          metadata: agentResponse.metadata,
        }
      }

      logger.info('[MessageRouter] Message routed successfully', {
        messageId: message.id,
        channelId: message.channelId,
        agentEndpoint: route.agentEndpoint,
        hasResponse: !!agentResponse.response,
      })

      return {
        success: true,
        response: agentResponse.response,
        metadata: {
          ...agentResponse.metadata,
          agentEndpoint: route.agentEndpoint,
          environment: route.environment,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error('[MessageRouter] Failed to send message to agent', {
        messageId: message.id,
        channelId: message.channelId,
        agentEndpoint: route.agentEndpoint,
        error: errorMessage,
      })

      return {
        success: false,
        error: `Failed to communicate with agent: ${errorMessage}`,
        metadata: {
          agentEndpoint: route.agentEndpoint,
        },
      }
    }
  }
}

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
 * const messageRouter = new MessageRouter(routerService)
 * setupBaileysDirectRouting(messageRouter)
 * ```
 */
export function setupBaileysDirectRouting(messageRouter: MessageRouter): void {
  if (isDebugMode()) {
    logger.debug('[MessageRouter] Setting up Baileys direct routing')
  }

  const connection = getBaileysConnection()

  // Register message handler that routes through MessageRouter
  connection.onMessage(async (message) => {
    if (isDebugMode()) {
      logger.debug('[MessageRouter] Baileys message received', {
        messageId: message.id,
        channelId: message.channelId,
      })
    }

    const result = await messageRouter.routeMessage(message)

    // If agent returned a response, send it back via Baileys
    if (result.success && result.response) {
      try {
        await connection.sendTextMessage(message.from, result.response)

        if (isDebugMode()) {
          logger.debug('[MessageRouter] Response sent back to user', {
            messageId: message.id,
            responseLength: result.response.length,
          })
        }

        logger.info('[MessageRouter] Complete message flow successful', {
          messageId: message.id,
          channelId: message.channelId,
        })
      } catch (error) {
        logger.error('[MessageRouter] Failed to send response back', {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return result
  })

  logger.info('[MessageRouter] Baileys direct routing configured')
}

