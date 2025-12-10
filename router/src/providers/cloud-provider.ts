/**
 * WhatsApp Cloud API provider implementation.
 * 
 * This adapter implements the WhatsAppProvider interface for the official
 * WhatsApp Cloud API. This will be implemented in Phase 2.
 */

import type { IncomingMessage, OutgoingMessage } from '../core/models.js'
import type { WhatsAppProvider } from '../core/whatsapp-provider.js'

/**
 * Configuration for WhatsApp Cloud API provider.
 */
export interface CloudApiProviderConfig {
  /** Cloud API access token */
  accessToken: string
  /** Phone number ID */
  phoneNumberId: string
}

/**
 * WhatsApp Cloud API provider implementation.
 */
export class CloudApiProvider implements WhatsAppProvider {
  constructor(private config: CloudApiProviderConfig) {
    // Config will be used when implementing sendMessage
    void this.config
  }

  /**
   * Sends a message via WhatsApp Cloud API.
   * 
   * @param message - The message to send
   * @returns Promise that resolves when the message is sent
   * @throws {Error} If the message fails to send
   */
  async sendMessage(_message: OutgoingMessage): Promise<void> {
    // TODO: Implement WhatsApp Cloud API HTTP client
    // This will be implemented in Phase 2
    throw new Error('CloudApiProvider.sendMessage not yet implemented')
  }

  /**
   * Normalizes WhatsApp Cloud API webhook payload to domain IncomingMessage.
   * 
   * @param _payload - Raw webhook payload from WhatsApp Cloud API
   * @returns Normalized IncomingMessage or null if payload is invalid
   */
  normalizeWebhook(_payload: unknown): IncomingMessage | null {
    // TODO: Implement WhatsApp Cloud API webhook normalization
    // This will be implemented in Phase 2
    return null
  }
}

