/**
 * Agent client factory implementation.
 * 
 * This module provides the infrastructure implementation of AgentClientFactory.
 * Following Clean Architecture, this is an infrastructure concern that
 * implements the core AgentClientFactory interface.
 * 
 * @module infra/agent-client-factory
 */

import type { AgentClientFactory, AdkClientConfig } from '../core/agent-client.js'
import type { AgentClient } from '../core/agent-client.js'
import { HttpAgentClient, type HttpAgentClientConfig } from './http-agent-client.js'

/**
 * Infrastructure implementation of AgentClientFactory.
 * 
 * This factory creates HttpAgentClient instances for ADK agents.
 */
export class HttpAgentClientFactory implements AgentClientFactory {
  /**
   * Creates an ADK agent client with the specified configuration.
   * 
   * @param config - ADK client configuration
   * @returns A configured AgentClient instance
   */
  createAdkClient(config: AdkClientConfig): AgentClient {
    const httpConfig: HttpAgentClientConfig = {
      timeout: config.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      adk: {
        appName: config.appName,
        baseUrl: config.baseUrl,
        sessionIdGenerator: config.sessionIdGenerator,
      },
    }

    return new HttpAgentClient(httpConfig)
  }
}
