/**
 * Message handler interface for the wa2ai router.
 * 
 * This module defines the port (interface) for handling incoming messages.
 * Following Clean Architecture, this interface lives in the core layer
 * and is implemented by infrastructure/application layers.
 * 
 * @module core/message-handler
 */

import type { IncomingMessage } from './models.js'

/**
 * Result of processing a message.
 */
export interface MessageHandlerResult {
  /** Whether the message was successfully processed */
  success: boolean
  /** Response to send back (if any) */
  response?: string
  /** Error message if processing failed */
  error?: string
  /** Additional metadata about the processing */
  metadata?: Record<string, unknown>
}

/**
 * Callback function type for handling incoming messages.
 * 
 * @param message - The normalized incoming message
 * @returns Promise resolving to the handler result
 */
export type MessageHandlerCallback = (message: IncomingMessage) => Promise<MessageHandlerResult>

/**
 * Interface for message handler implementations.
 * 
 * This is the port that defines how messages should be handled.
 * Implementations can route messages to AI agents, store them,
 * or perform any other business logic.
 * 
 * @example
 * ```typescript
 * class AgentMessageHandler implements MessageHandler {
 *   async handleMessage(message: IncomingMessage): Promise<MessageHandlerResult> {
 *     // Route to AI agent
 *     const response = await this.agentService.process(message.text)
 *     return { success: true, response }
 *   }
 * }
 * ```
 */
export interface MessageHandler {
  /**
   * Handles an incoming message.
   * 
   * @param message - The normalized incoming message
   * @returns Promise resolving to the handler result
   */
  handleMessage(message: IncomingMessage): Promise<MessageHandlerResult>
}

/**
 * Options for message filtering.
 */
export interface MessageFilterOptions {
  /** Whether to ignore messages sent by the bot itself */
  ignoreFromMe?: boolean
  /** Whether to ignore messages from groups (only handle direct messages) */
  ignoreGroups?: boolean
  /** Whether to ignore status broadcasts */
  ignoreStatusBroadcast?: boolean
  /** Specific JIDs to ignore */
  ignoreJids?: string[]
}

/**
 * Default message filter options.
 */
export const DEFAULT_MESSAGE_FILTER_OPTIONS: MessageFilterOptions = {
  ignoreFromMe: true,
  ignoreGroups: false,
  ignoreStatusBroadcast: true,
  ignoreJids: [],
}
