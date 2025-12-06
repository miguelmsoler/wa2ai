/**
 * Evolution API provider implementation.
 * 
 * This adapter implements the WhatsAppProvider interface for Evolution API.
 */

import type { OutgoingMessage } from '../core/models.js'
import type { WhatsAppProvider } from './whatsapp-provider.js'

/**
 * Configuration for Evolution API provider.
 */
export interface EvolutionProviderConfig {
  /** Evolution API base URL */
  apiUrl: string
  /** API key for authentication */
  apiKey: string
}

/**
 * Evolution API provider implementation.
 */
export class EvolutionProvider implements WhatsAppProvider {
  constructor(private config: EvolutionProviderConfig) {
    // Config will be used when implementing sendMessage
    void this.config
  }

  /**
   * Sends a message via Evolution API.
   * 
   * @param message - The message to send
   * @returns Promise that resolves when the message is sent
   * @throws {Error} If the message fails to send
   */
  async sendMessage(_message: OutgoingMessage): Promise<void> {
    // TODO: Implement Evolution API HTTP client
    // This will be implemented in Phase 1
    throw new Error('EvolutionProvider.sendMessage not yet implemented')
  }
}

