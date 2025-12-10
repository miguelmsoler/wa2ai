/**
 * Baileys provider implementation.
 * 
 * This adapter implements the WhatsAppProvider interface for Baileys direct connection.
 */

import type { IncomingMessage, OutgoingMessage } from '../core/models.js'
import type { WhatsAppProvider } from '../core/whatsapp-provider.js'
import type { MessageFilterOptions } from '../core/message-handler.js'
import { logger, isDebugMode } from '../core/logger.js'
import { getBaileysConnection } from './baileys-connection.js'

/**
 * Configuration for Baileys provider.
 */
export interface BaileysProviderConfig {
  /** Optional: Custom Baileys connection service instance. If not provided, creates one with default config. */
  connectionService?: ReturnType<typeof getBaileysConnection>
  /** Optional: Directory to store authentication state. Only used if connectionService is not provided. */
  authDir?: string
  /** Optional: Whether to print QR in terminal. Only used if connectionService is not provided. */
  printQRInTerminal?: boolean
  /** Optional: Message filter options. Only used if connectionService is not provided. */
  messageFilter?: MessageFilterOptions
}

/**
 * Baileys provider implementation.
 * 
 * This provider uses the BaileysConnectionService to send messages
 * directly via WhatsApp Web connection.
 */
export class BaileysProvider implements WhatsAppProvider {
  private connectionService: ReturnType<typeof getBaileysConnection>

  constructor(config: BaileysProviderConfig = {}) {
    if (config.connectionService) {
      // Use provided connection service
      this.connectionService = config.connectionService
    } else {
      // Create connection service with provided config or defaults
      // This ensures the singleton is initialized with the correct messageFilter
      this.connectionService = getBaileysConnection({
        authDir: config.authDir,
        printQRInTerminal: config.printQRInTerminal,
        messageFilter: config.messageFilter,
      })
    }
  }

  /**
   * Sends a message via Baileys direct connection.
   * 
   * Uses the BaileysConnectionService to send messages through
   * the active WhatsApp Web connection.
   * 
   * @param message - The message to send
   * @returns Promise that resolves when the message is sent
   * @throws {Error} If the message fails to send or connection is not available
   */
  async sendMessage(message: OutgoingMessage): Promise<void> {
    if (isDebugMode()) {
      logger.debug('[BaileysProvider] Sending message', {
        to: message.to,
        channelId: message.channelId,
        textLength: message.text.length,
      })
    }

    // Ensure 'to' is in JID format (add @s.whatsapp.net if not present)
    const jid = this.ensureJidFormat(message.to)

    try {
      // Check connection state
      const state = this.connectionService.getState()
      if (state.status !== 'connected') {
        const errorMessage = `Baileys connection is not ready (status: ${state.status})`
        logger.error('[BaileysProvider] Cannot send message - connection not ready', {
          to: message.to,
          channelId: message.channelId,
          connectionStatus: state.status,
        })
        throw new Error(errorMessage)
      }

      // Send message via BaileysConnectionService
      await this.connectionService.sendTextMessage(jid, message.text)

      if (isDebugMode()) {
        logger.debug('[BaileysProvider] Message sent successfully', {
          to: message.to,
          jid,
          channelId: message.channelId,
        })
      }

      logger.info('[BaileysProvider] Message sent via Baileys', {
        to: message.to,
        channelId: message.channelId,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      logger.error('[BaileysProvider] Error sending message', {
        to: message.to,
        channelId: message.channelId,
        error: errorMessage,
      })
      
      throw new Error(`Failed to send message via Baileys: ${errorMessage}`)
    }
  }

  /**
   * Ensures the recipient identifier is in JID format.
   * 
   * If the identifier doesn't have a suffix (@s.whatsapp.net or @g.us),
   * it assumes it's a phone number and adds @s.whatsapp.net.
   * 
   * @param identifier - The recipient identifier (phone number or JID)
   * @returns The JID-formatted identifier
   */
  private ensureJidFormat(identifier: string): string {
    // If already in JID format, return as-is
    if (identifier.includes('@')) {
      return identifier
    }

    // Assume it's a phone number and add @s.whatsapp.net
    return `${identifier}@s.whatsapp.net`
  }

  /**
   * Normalizes webhook payload (not applicable for Baileys).
   * 
   * Baileys uses direct callbacks instead of webhooks, so this method
   * always returns null. Webhook normalization is not needed for Baileys.
   * 
   * @param _payload - Raw webhook payload (not used)
   * @returns Always returns null since Baileys doesn't use webhooks
   */
  normalizeWebhook(_payload: unknown): IncomingMessage | null {
    if (isDebugMode()) {
      logger.debug('[BaileysProvider] normalizeWebhook called - Baileys does not use webhooks')
    }
    return null
  }
}
