/**
 * Agent client interface (port).
 * 
 * This interface defines the contract for communicating with AI agent endpoints.
 * Following Clean Architecture, this is a domain port that belongs in the core layer.
 * 
 * Implementations (HTTP, gRPC, etc.) should be in the infrastructure layer.
 * 
 * @module core/agent-client
 */

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
 * Interface for agent client implementations.
 * 
 * This interface abstracts the communication with AI agent endpoints,
 * allowing different implementations (HTTP, gRPC, WebSocket, etc.).
 */
export interface AgentClient {
  /**
   * Sends a message to an agent endpoint.
   * 
   * @param agentEndpoint - The URL of the agent endpoint
   * @param message - The incoming message to send
   * @returns Promise resolving to the agent response
   * 
   * @throws {Error} If the request fails or times out
   */
  sendMessage(agentEndpoint: string, message: IncomingMessage): Promise<AgentResponse>
}

