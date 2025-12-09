/**
 * Webhook adapter - converts provider-specific webhook formats to domain models.
 * 
 * This module contains pure domain logic for normalizing webhook payloads
 * from different WhatsApp providers into domain models.
 */

import type { IncomingMessage } from './models.js'
import { logger } from './logger.js'

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
 * Normalizes Evolution API webhook payload to domain IncomingMessage.
 * 
 * @param payload - Raw webhook payload from Evolution API
 * @returns Normalized IncomingMessage or null if payload is invalid
 */
export function normalizeEvolutionApiWebhook(
  payload: unknown
): IncomingMessage | null {
  const webhook = payload as EvolutionApiWebhookPayload
  
  // Extract event type and instance
  const eventType = webhook?.event
  const instance = webhook?.instance || 'unknown'
  
  if (!eventType) {
    logger.warn('[WebhookAdapter] Received webhook with unknown format', {
      payload,
    })
    return null
  }
  
  logger.info('[WebhookAdapter] Processing webhook event', {
    eventType,
    instance,
  })
  
  // Only process messages.upsert events
  if (eventType !== 'messages.upsert') {
    logger.debug('[WebhookAdapter] Ignoring non-message event', {
      eventType,
      instance,
    })
    return null
  }
  
  const data = webhook.data as EvolutionApiMessageData | undefined
  
  if (!data) {
    logger.warn('[WebhookAdapter] messages.upsert event has no data', {
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
  
  // Extract channel ID from remoteJid (format: number@s.whatsapp.net or number:number@g.us)
  const channelId = extractChannelId(remoteJid)
  
  // Extract timestamp
  const timestamp = data.messageTimestamp
    ? new Date(data.messageTimestamp * 1000)
    : new Date()
  
  logger.info('[WebhookAdapter] Message normalized', {
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
function extractChannelId(jid: string): string {
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

