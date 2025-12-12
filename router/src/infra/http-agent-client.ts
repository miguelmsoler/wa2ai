/**
 * HTTP implementation of AgentClient for ADK (Agent Development Kit) agents.
 * 
 * This module provides the HTTP-based implementation for communicating
 * with ADK agent endpoints using the ADK API format as specified in refs/adk_api.md.
 * Following Clean Architecture, this is an infrastructure concern that
 * implements the core AgentClient interface.
 * 
 * Note: This is currently the only agent client implementation. Other implementations
 * (e.g., gRPC, WebSocket, or other agent protocols) can be added in the future
 * by implementing the AgentClient interface.
 * 
 * @module infra/http-agent-client
 */

import { logger, isDebugMode } from '../core/logger.js'
import type { IncomingMessage } from '../core/models.js'
import type { AgentClient, AgentClientConfig, AgentResponse } from '../core/agent-client.js'

/**
 * ADK-specific configuration.
 */
export interface AdkConfig {
  /** ADK agent name (directory name, not constructor name) */
  appName: string
  /** Base URL of ADK server (e.g., 'http://localhost:8000') */
  baseUrl: string
  /** Optional: Custom session ID generator. Default uses from_channelId format */
  sessionIdGenerator?: (message: IncomingMessage) => string
}

/**
 * Configuration for HttpAgentClient (always requires ADK config).
 */
export interface HttpAgentClientConfig extends AgentClientConfig {
  /** ADK configuration (required) */
  adk: AdkConfig
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
 * ADK Event structure (from ADK API).
 */
interface AdkEvent {
  content: {
    parts: Array<{ text?: string }>
    role: 'user' | 'model'
  }
  invocationId: string
  author: 'user' | 'model'
  actions?: {
    stateDelta?: Record<string, unknown>
    artifactDelta?: Record<string, unknown>
  }
}

/**
 * HTTP-based implementation of AgentClient for ADK agents.
 * 
 * This client sends incoming messages to ADK agent endpoints via HTTP POST
 * using the ADK API format (POST /run endpoint) as specified in refs/adk_api.md.
 * 
 * This is the current implementation for agent communication. The system is
 * designed to support other agent protocols in the future (e.g., gRPC, WebSocket)
 * by implementing additional AgentClient implementations.
 * 
 * @example
 * ```typescript
 * const client = new HttpAgentClient({
 *   timeout: 30000,
 *   adk: {
 *     appName: 'my_sample_agent',
 *     baseUrl: 'http://localhost:8000',
 *   }
 * })
 * const response = await client.sendMessage(
 *   'http://localhost:8000', // baseUrl
 *   incomingMessage
 * )
 * ```
 */
export class HttpAgentClient implements AgentClient {
  private config: Required<AgentClientConfig>
  private adkConfig: AdkConfig

  constructor(config: HttpAgentClientConfig) {
    this.config = {
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      headers: {
        ...DEFAULT_CONFIG.headers,
        ...config.headers,
      },
    }

    this.adkConfig = config.adk

    if (isDebugMode()) {
      logger.debug('[HttpAgentClient] Initialized', {
        timeout: this.config.timeout,
        headers: Object.keys(this.config.headers),
        adkAppName: this.adkConfig.appName,
        baseUrl: this.adkConfig.baseUrl,
      })
    }
  }

  /**
   * Sends a message to an ADK agent endpoint.
   * 
   * Uses ADK format (POST /run endpoint) as specified in refs/adk_api.md.
   * 
   * @param agentEndpoint - The base URL of the ADK server
   * @param message - The incoming message to send
   * @returns Promise resolving to the agent response
   * 
   * @throws {Error} If the request fails or times out
   */
  async sendMessage(agentEndpoint: string, message: IncomingMessage): Promise<AgentResponse> {
    return this.sendAdkMessage(agentEndpoint, message)
  }

  /**
   * Sends a message using ADK format (POST /run endpoint).
   * 
   * @param baseUrl - Base URL of ADK server
   * @param message - The incoming message to send
   * @returns Promise resolving to the agent response
   * 
   * @throws {Error} If the request fails or times out
   */
  private async sendAdkMessage(baseUrl: string, message: IncomingMessage): Promise<AgentResponse> {
    if (isDebugMode()) {
      logger.debug('[HttpAgentClient] Sending ADK message', {
        baseUrl,
        appName: this.adkConfig!.appName,
        messageId: message.id,
        channelId: message.channelId,
        from: message.from,
      })
    }

    // Generate session ID (default: from_channelId format)
    const sessionId = this.adkConfig!.sessionIdGenerator
      ? this.adkConfig!.sessionIdGenerator(message)
      : `${message.from}_${message.channelId}`.replace(/[^a-zA-Z0-9_]/g, '_')

    // Extract user ID from message.from (remove @s.whatsapp.net suffix if present)
    const userId = message.from.replace(/@.*$/, '').replace(/[^a-zA-Z0-9_]/g, '_')

    // Build ADK request body according to adk_api.md
    const adkRequest = {
      app_name: this.adkConfig!.appName,
      user_id: userId,
      session_id: sessionId,
      new_message: {
        parts: [{ text: message.text }],
      },
      streaming: false,
      state_delta: null,
      invocation_id: null,
    }

    // ADK endpoint is /run
    const adkEndpoint = `${baseUrl.replace(/\/$/, '')}/run`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(adkEndpoint, {
        method: 'POST',
        headers: this.config.headers,
        body: JSON.stringify(adkRequest),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`ADK agent endpoint returned ${response.status}: ${errorText}`)
      }

      // ADK returns an array of Event objects
      const events = await response.json() as AdkEvent[]

      if (!Array.isArray(events)) {
        throw new Error('ADK response is not an array of events')
      }

      // Extract text from the last model event (author === 'model')
      const modelEvents = events.filter((e) => e.author === 'model')
      if (modelEvents.length === 0) {
        logger.warn('[HttpAgentClient] No model events in ADK response', {
          baseUrl,
          messageId: message.id,
          eventCount: events.length,
        })
        return {
          success: true,
          // No response text
        }
      }

      const lastEvent = modelEvents[modelEvents.length - 1]
      const textParts = lastEvent.content.parts
        .filter((p) => p.text)
        .map((p) => p.text!)
      const responseText = textParts.join('')

      if (isDebugMode()) {
        logger.debug('[HttpAgentClient] ADK response processed', {
          baseUrl,
          messageId: message.id,
          eventCount: events.length,
          modelEventCount: modelEvents.length,
          responseLength: responseText.length,
        })
      }

      logger.info('[HttpAgentClient] ADK message sent successfully', {
        baseUrl,
        appName: this.adkConfig!.appName,
        messageId: message.id,
        sessionId,
      })

      return {
        success: true,
        response: responseText,
        metadata: {
          adk: {
            sessionId,
            userId,
            eventCount: events.length,
            invocationId: lastEvent.invocationId,
          },
        },
      }
    } catch (error) {
      clearTimeout(timeoutId)

      const errorMessage = error instanceof Error ? error.message : String(error)
      const isTimeout = error instanceof Error && error.name === 'AbortError'

      logger.error('[HttpAgentClient] Failed to send ADK message', {
        baseUrl,
        appName: this.adkConfig!.appName,
        messageId: message.id,
        error: errorMessage,
        timeout: isTimeout,
      })

      throw new Error(
        isTimeout
          ? `ADK request timed out after ${this.config.timeout}ms`
          : `Failed to send message to ADK agent: ${errorMessage}`
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
