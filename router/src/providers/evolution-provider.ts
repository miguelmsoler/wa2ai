/**
 * Evolution API provider implementation.
 * 
 * This adapter implements the WhatsAppProvider interface for Evolution API.
 */

import type { IncomingMessage, OutgoingMessage } from '../core/models.js'
import type { WhatsAppProvider } from '../core/whatsapp-provider.js'
import { logger, isDebugMode } from '../core/logger.js'

/**
 * Configuration for Evolution API provider.
 */
export interface EvolutionProviderConfig {
  /** Evolution API base URL */
  apiUrl: string
  /** API key for authentication */
  apiKey: string
  /** Instance name (default: 'wa2ai-lab') */
  instanceName?: string
}

/**
 * Evolution API response structure.
 */
interface EvolutionApiResponse {
  key?: {
    remoteJid?: string
    id?: string
  }
  message?: unknown
  status?: number
  response?: {
    id?: string
    status?: string
  }
}

/**
 * Evolution API webhook payload structure.
 */
interface EvolutionApiWebhookPayload {
  event?: string
  instance?: string
  data?: unknown
}

/**
 * Evolution API message data structure.
 */
interface EvolutionApiMessageData {
  key?: {
    remoteJid?: string
    fromMe?: boolean
    id?: string
  }
  from?: string
  message?: {
    conversation?: string
    extendedTextMessage?: {
      text?: string
    }
    imageMessage?: {
      caption?: string
    }
    [key: string]: unknown
  }
  messageTimestamp?: number
}

/**
 * Evolution API provider implementation.
 */
export class EvolutionProvider implements WhatsAppProvider {
  private readonly instanceName: string

  constructor(private config: EvolutionProviderConfig) {
    this.instanceName = config.instanceName || 'wa2ai-lab'
  }

  /**
   * Sends a message via Evolution API.
   * 
   * Uses Evolution API v2 endpoint: POST /message/sendText/{instance}
   * 
   * @param message - The message to send
   * @returns Promise that resolves when the message is sent
   * @throws {Error} If the message fails to send
   */
  async sendMessage(message: OutgoingMessage): Promise<void> {
    if (isDebugMode()) {
      logger.debug('[EvolutionProvider] Sending message', {
        instanceName: this.instanceName,
        to: message.to,
        channelId: message.channelId,
        textLength: message.text.length,
      })
    }

    // Extract phone number from 'to' field (remove @s.whatsapp.net if present)
    const phoneNumber = message.to.replace('@s.whatsapp.net', '').replace('@g.us', '')

    // Evolution API endpoint: POST /message/sendText/{instance}
    const url = `${this.config.apiUrl}/message/sendText/${this.instanceName}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.apiKey,
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: message.text,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        const errorMessage = `Evolution API returned ${response.status}: ${errorText}`
        
        logger.error('[EvolutionProvider] Failed to send message', {
          instanceName: this.instanceName,
          to: message.to,
          channelId: message.channelId,
          status: response.status,
          error: errorText,
        })
        
        throw new Error(errorMessage)
      }

      const responseData = await response.json() as EvolutionApiResponse

      if (isDebugMode()) {
        logger.debug('[EvolutionProvider] Message sent successfully', {
          instanceName: this.instanceName,
          to: message.to,
          channelId: message.channelId,
          messageId: responseData.key?.id || responseData.response?.id,
          status: responseData.status || responseData.response?.status,
        })
      }

      logger.info('[EvolutionProvider] Message sent via Evolution API', {
        instanceName: this.instanceName,
        to: message.to,
        channelId: message.channelId,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      logger.error('[EvolutionProvider] Error sending message', {
        instanceName: this.instanceName,
        to: message.to,
        channelId: message.channelId,
        error: errorMessage,
      })
      
      throw new Error(`Failed to send message via Evolution API: ${errorMessage}`)
    }
  }

  /**
   * Normalizes Evolution API webhook payload to domain IncomingMessage.
   * 
   * @param payload - Raw webhook payload from Evolution API
   * @returns Normalized IncomingMessage or null if payload is invalid
   */
  normalizeWebhook(payload: unknown): IncomingMessage | null {
    const webhook = payload as EvolutionApiWebhookPayload
    
    // Extract event type and instance
    const eventType = webhook?.event
    const instance = webhook?.instance || 'unknown'
    
    if (!eventType) {
      logger.warn('[EvolutionProvider] Received webhook with unknown format', {
        payload,
      })
      return null
    }
    
    logger.info('[EvolutionProvider] Processing webhook event', {
      eventType,
      instance,
    })
    
    // Only process messages.upsert events
    if (eventType !== 'messages.upsert') {
      if (isDebugMode()) {
        logger.debug('[EvolutionProvider] Ignoring non-message event', {
          eventType,
          instance,
        })
      }
      return null
    }
    
    const data = webhook.data as EvolutionApiMessageData | undefined
    
    if (!data) {
      logger.warn('[EvolutionProvider] messages.upsert event has no data', {
        eventType,
        instance,
      })
      return null
    }
    
    // Extract message information
    const remoteJid = data.key?.remoteJid || data.from || 'unknown'
    const messageId = data.key?.id || `msg-${Date.now()}`
    
    // Extract message text from different message types
    let messageText = '[media or unsupported message type]'
    if (data.message?.conversation) {
      messageText = data.message.conversation
    } else if (data.message?.extendedTextMessage?.text) {
      messageText = data.message.extendedTextMessage.text
    } else if (data.message?.imageMessage?.caption) {
      messageText = data.message.imageMessage.caption
    }
    
    // Extract channel ID from remoteJid
    const channelId = this.extractChannelId(remoteJid)
    
    // Extract timestamp
    const timestamp = data.messageTimestamp
      ? new Date(data.messageTimestamp * 1000)
      : new Date()
    
    logger.info('[EvolutionProvider] Message normalized', {
      messageId,
      from: remoteJid,
      channelId,
      messageText,
    })
    
    return {
      id: messageId,
      from: remoteJid,
      channelId,
      text: messageText,
      timestamp,
      metadata: {
        instance,
        eventType,
        rawMessage: data.message,
      },
    }
  }

  /**
   * Extracts channel ID from WhatsApp JID.
   * 
   * @param jid - WhatsApp JID (e.g., "1234567890@s.whatsapp.net" or "1234567890:1234567890@g.us")
   * @returns Channel identifier
   */
  private extractChannelId(jid: string): string {
    // For individual chats: use the phone number part
    // For groups: use the full JID
    if (jid.includes('@g.us')) {
      // Group chat - use full JID as channel ID
      return jid
    }
    // Individual chat - extract phone number
    const match = jid.match(/^(\d+)/)
    return match ? match[1] : jid
  }
}

