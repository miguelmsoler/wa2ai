/**
 * WhatsApp provider interface (port).
 * 
 * This interface defines the contract that all WhatsApp provider
 * implementations must follow, enabling interchangeable providers.
 * 
 * This is a domain port (interface) and belongs in the core layer.
 */

import type { IncomingMessage, OutgoingMessage } from './models.js'

/**
 * Interface for WhatsApp provider implementations.
 * 
 * Providers abstract the details of sending messages through different
 * WhatsApp services (Evolution API, Cloud API, Baileys, etc.).
 */
export interface WhatsAppProvider {
  /**
   * Sends a message via the configured WhatsApp provider.
   * 
   * @param message - The message to send
   * @returns Promise that resolves when the message is sent
   * @throws {Error} If the message fails to send
   */
  sendMessage(message: OutgoingMessage): Promise<void>

  /**
   * Normalizes a webhook payload from the provider's specific format
   * to the domain IncomingMessage model.
   * 
   * Each provider is responsible for normalizing its own webhook format.
   * 
   * @param payload - Raw webhook payload from the provider
   * @returns Normalized IncomingMessage or null if payload is invalid or not a message
   */
  normalizeWebhook(payload: unknown): IncomingMessage | null
}

