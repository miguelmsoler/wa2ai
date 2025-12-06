/**
 * WhatsApp provider interface.
 * 
 * This interface defines the contract that all WhatsApp provider
 * implementations must follow, enabling interchangeable providers.
 */

import type { OutgoingMessage } from '../core/models.js'

/**
 * Interface for WhatsApp provider implementations.
 * 
 * Providers abstract the details of sending messages through different
 * WhatsApp services (Evolution API, Cloud API, etc.).
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
}

