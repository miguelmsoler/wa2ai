/**
 * Agent client for sending messages to AI agents.
 * 
 * This module handles HTTP communication with agent endpoints.
 * Following Clean Architecture, this is an infrastructure concern
 * that implements the agent communication protocol.
 * 
 * @module core/agent-client
 */

import { logger, isDebugMode } from './logger.js'
import type { IncomingMessage } from './models.js'

/**
 * Response from an agent endpoint.
 */
export interface AgentResponse {
  /** Whether the agent processed the message successfully */
  success: boolean
  /** Response text to send back to the user */
  response?: string
  /** Error message if processing failed */
  error?: string
  /** Additional metadata from the agent */
  metadata?: Record<string, unknown>
}

/**
 * Configuration for agent client.
 */
export interface AgentClientConfig {
  /** Request timeout in milliseconds */
  timeout?: number
  /** Additional headers to include in requests */
  headers?: Record<string, string>
}

/**
 * Default configuration for agent client.
 */
const DEFAULT_CONFIG: Required<AgentClientConfig> = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * Client for communicating with AI agent endpoints.
 * 
 * This client sends incoming messages to agent endpoints via HTTP POST
 * and handles the response, which may include a message to send back.
 * 
 * @example
 * ```typescript
 * const client = new AgentClient({ timeout: 10000 })
 * const response = await client.sendMessage(
 *   'http://localhost:8000/agent',
 *   incomingMessage
 * )
 * if (response.success && response.response) {
 *   // Send response back to user
 * }
 * ```
 */
export class AgentClient {
  private config: Required<AgentClientConfig>

  constructor(config: AgentClientConfig = {}) {
    this.config = {
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      headers: {
        ...DEFAULT_CONFIG.headers,
        ...config.headers,
      },
    }

    if (isDebugMode()) {
      logger.debug('[AgentClient] Initialized', {
        timeout: this.config.timeout,
        headers: Object.keys(this.config.headers),
      })
    }
  }

  /**
   * Sends a message to an agent endpoint.
   * 
   * @param agentEndpoint - The URL of the agent endpoint
   * @param message - The incoming message to send
   * @returns Promise resolving to the agent response
   * 
   * @throws {Error} If the request fails or times out
   */
  async sendMessage(agentEndpoint: string, message: IncomingMessage): Promise<AgentResponse> {
    if (isDebugMode()) {
      logger.debug('[AgentClient] Sending message to agent', {
        agentEndpoint,
        messageId: message.id,
        channelId: message.channelId,
      })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(agentEndpoint, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify({
          id: message.id,
          from: message.from,
          channelId: message.channelId,
          text: message.text,
          timestamp: message.timestamp.toISOString(),
          metadata: message.metadata,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Agent endpoint returned ${response.status}: ${errorText}`)
      }

      const responseData = await response.json() as AgentResponse

      if (isDebugMode()) {
        logger.debug('[AgentClient] Agent response received', {
          agentEndpoint,
          messageId: message.id,
          success: responseData.success,
          hasResponse: !!responseData.response,
        })
      }

      logger.info('[AgentClient] Message sent to agent', {
        agentEndpoint,
        messageId: message.id,
        success: responseData.success,
      })

      return responseData
    } catch (error) {
      clearTimeout(timeoutId)

      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = error instanceof Error && error.name === 'AbortError'

      logger.error('[AgentClient] Failed to send message to agent', {
        agentEndpoint,
        messageId: message.id,
        error: errorMessage,
        timeout: isTimeout,
      })

      throw new Error(
        isTimeout
          ? `Request to agent timed out after ${this.config.timeout}ms`
          : `Failed to send message to agent: ${errorMessage}`
      )
    }
  }

  /**
   * Validates that an agent endpoint URL is valid.
   * 
   * @param url - The URL to validate
   * @returns True if the URL is valid
   */
  static isValidEndpoint(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }
}

