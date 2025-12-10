/**
 * HTTP implementation of AgentClient.
 * 
 * This module provides the HTTP-based implementation for communicating
 * with AI agent endpoints. Following Clean Architecture, this is an
 * infrastructure concern that implements the core AgentClient interface.
 * 
 * @module infra/http-agent-client
 */

import { logger, isDebugMode } from '../core/logger.js'
import type { IncomingMessage } from '../core/models.js'
import type { AgentClient, AgentClientConfig, AgentResponse } from '../core/agent-client.js'

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
 * HTTP-based implementation of AgentClient.
 * 
 * This client sends incoming messages to agent endpoints via HTTP POST
 * and handles the response, which may include a message to send back.
 * 
 * @example
 * ```typescript
 * const client = new HttpAgentClient({ timeout: 10000 })
 * const response = await client.sendMessage(
 *   'http://localhost:8000/agent',
 *   incomingMessage
 * )
 * if (response.success && response.response) {
 *   // Send response back to user
 * }
 * ```
 */
export class HttpAgentClient implements AgentClient {
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
      logger.debug('[HttpAgentClient] Initialized', {
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
      logger.debug('[HttpAgentClient] Sending message to agent', {
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
        logger.debug('[HttpAgentClient] Agent response received', {
          agentEndpoint,
          messageId: message.id,
          success: responseData.success,
          hasResponse: !!responseData.response,
        })
      }

      logger.info('[HttpAgentClient] Message sent to agent', {
        agentEndpoint,
        messageId: message.id,
        success: responseData.success,
      })

      return responseData
    } catch (error) {
      clearTimeout(timeoutId)

      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = error instanceof Error && error.name === 'AbortError'

      logger.error('[HttpAgentClient] Failed to send message to agent', {
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
