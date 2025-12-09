/**
 * Baileys message adapter.
 * 
 * This module provides functions to normalize Baileys messages
 * into the wa2ai domain model format (IncomingMessage).
 * 
 * Following Clean Architecture, this adapter lives in the providers layer
 * and converts infrastructure-specific types to domain types.
 * 
 * @module providers/baileys-message-adapter
 */

import { getContentType, type proto } from '@whiskeysockets/baileys'
import type { IncomingMessage } from '../core/models.js'
import type { MessageFilterOptions } from '../core/message-handler.js'
import { DEFAULT_MESSAGE_FILTER_OPTIONS } from '../core/message-handler.js'
import { logger, isDebugMode } from '../core/logger.js'

/**
 * Type alias for Baileys web message info.
 */
export type BaileysWebMessageInfo = proto.IWebMessageInfo

/**
 * Type alias for Baileys message content.
 */
export type BaileysMessageContent = proto.IMessage

/**
 * Supported message types that can be extracted.
 */
export type SupportedMessageType =
  | 'conversation'
  | 'extendedTextMessage'
  | 'imageMessage'
  | 'videoMessage'
  | 'audioMessage'
  | 'documentMessage'
  | 'stickerMessage'
  | 'contactMessage'
  | 'locationMessage'
  | 'reactionMessage'
  | 'pollCreationMessage'
  | 'unknown'

/**
 * Extracts the channel ID from a WhatsApp JID.
 * 
 * JID format: `number@s.whatsapp.net` (individual) or `number@g.us` (group)
 * 
 * @param jid - The WhatsApp JID
 * @returns The extracted channel ID (phone number or group ID)
 * 
 * @example
 * ```typescript
 * extractChannelId('5491155551234@s.whatsapp.net') // '5491155551234'
 * extractChannelId('120363123456789@g.us') // '120363123456789'
 * ```
 */
export function extractChannelId(jid: string): string {
  if (!jid) {
    return ''
  }
  // Remove the suffix (@s.whatsapp.net, @g.us, etc.)
  return jid.split('@')[0]
}

/**
 * Checks if a JID represents a group chat.
 * 
 * @param jid - The WhatsApp JID
 * @returns True if the JID is a group
 */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us')
}

/**
 * Checks if a JID represents a status broadcast.
 * 
 * @param jid - The WhatsApp JID
 * @returns True if the JID is a status broadcast
 */
export function isStatusBroadcast(jid: string): boolean {
  return jid === 'status@broadcast'
}

/**
 * Extracts text content from a Baileys message.
 * 
 * Handles different message types including:
 * - Simple text (conversation)
 * - Extended text (with reply data, mentions, etc.)
 * - Media with captions (images, videos, documents)
 * 
 * @param message - The Baileys message content
 * @returns The extracted text or a placeholder for media messages
 */
export function extractTextContent(message: BaileysMessageContent | null | undefined): string {
  if (!message) {
    return ''
  }

  // Simple text message
  if (message.conversation) {
    return message.conversation
  }

  // Extended text message (replies, mentions, etc.)
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text
  }

  // Image with caption
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption
  }

  // Video with caption
  if (message.videoMessage?.caption) {
    return message.videoMessage.caption
  }

  // Document with caption
  if (message.documentMessage?.caption) {
    return message.documentMessage.caption
  }

  // For other message types, return a placeholder
  const contentType = getContentType(message)
  if (contentType) {
    return `[${contentType}]`
  }

  return ''
}

/**
 * Gets the message type from a Baileys message.
 * 
 * @param message - The Baileys message content
 * @returns The detected message type
 */
export function getMessageType(message: BaileysMessageContent | null | undefined): SupportedMessageType {
  if (!message) {
    return 'unknown'
  }

  if (message.conversation) {
    return 'conversation'
  }
  if (message.extendedTextMessage) {
    return 'extendedTextMessage'
  }
  if (message.imageMessage) {
    return 'imageMessage'
  }
  if (message.videoMessage) {
    return 'videoMessage'
  }
  if (message.audioMessage) {
    return 'audioMessage'
  }
  if (message.documentMessage) {
    return 'documentMessage'
  }
  if (message.stickerMessage) {
    return 'stickerMessage'
  }
  if (message.contactMessage) {
    return 'contactMessage'
  }
  if (message.locationMessage) {
    return 'locationMessage'
  }
  if (message.reactionMessage) {
    return 'reactionMessage'
  }
  if (message.pollCreationMessage) {
    return 'pollCreationMessage'
  }

  return 'unknown'
}

/**
 * Normalizes a Baileys message to the wa2ai IncomingMessage format.
 * 
 * This is the main adapter function that converts Baileys-specific
 * message format to the domain model.
 * 
 * @param msg - The raw Baileys message
 * @returns The normalized IncomingMessage or null if message is invalid
 * 
 * @example
 * ```typescript
 * const baileysMsg = { key: { remoteJid: '123@s.whatsapp.net', id: 'abc' }, ... }
 * const normalized = normalizeBaileysMessage(baileysMsg)
 * // { id: 'abc', from: '123@s.whatsapp.net', channelId: '123', ... }
 * ```
 */
export function normalizeBaileysMessage(msg: BaileysWebMessageInfo): IncomingMessage | null {
  if (isDebugMode()) {
    logger.debug('[BaileysMessageAdapter] Normalizing message', {
      hasKey: !!msg.key,
      hasMessage: !!msg.message,
      remoteJid: msg.key?.remoteJid,
    })
  }

  // Validate required fields
  if (!msg.key?.remoteJid || !msg.key?.id) {
    if (isDebugMode()) {
      logger.debug('[BaileysMessageAdapter] Invalid message: missing key fields')
    }
    return null
  }

  if (!msg.message) {
    if (isDebugMode()) {
      logger.debug('[BaileysMessageAdapter] Invalid message: no message content')
    }
    return null
  }

  const jid = msg.key.remoteJid
  const text = extractTextContent(msg.message)
  const messageType = getMessageType(msg.message)

  // Convert timestamp (Baileys uses seconds, we need Date)
  let timestamp: Date
  const msgTimestamp = msg.messageTimestamp
  if (typeof msgTimestamp === 'number') {
    timestamp = new Date(msgTimestamp * 1000)
  } else if (msgTimestamp && typeof msgTimestamp === 'object' && 'low' in msgTimestamp) {
    // Handle Long type from protobuf
    timestamp = new Date((msgTimestamp as { low: number }).low * 1000)
  } else {
    timestamp = new Date()
  }

  const normalized: IncomingMessage = {
    id: msg.key.id,
    from: jid,
    channelId: extractChannelId(jid),
    text,
    timestamp,
    metadata: {
      messageType,
      fromMe: msg.key.fromMe ?? false,
      isGroup: isGroupJid(jid),
      pushName: msg.pushName,
      participant: msg.key.participant, // For group messages, the actual sender
    },
  }

  if (isDebugMode()) {
    logger.debug('[BaileysMessageAdapter] Message normalized', {
      id: normalized.id,
      from: normalized.from,
      channelId: normalized.channelId,
      messageType,
      textLength: text.length,
    })
  }

  return normalized
}

/**
 * Checks if a message should be processed based on filter options.
 * 
 * @param msg - The Baileys message to check
 * @param options - Filter options
 * @returns True if the message should be processed
 */
export function shouldProcessMessage(
  msg: BaileysWebMessageInfo,
  options: MessageFilterOptions = DEFAULT_MESSAGE_FILTER_OPTIONS
): boolean {
  if (isDebugMode()) {
    logger.debug('[BaileysMessageAdapter] Checking message filter', {
      messageId: msg.key?.id,
      fromMe: msg.key?.fromMe,
      remoteJid: msg.key?.remoteJid,
    })
  }

  // Check if message has required fields
  if (!msg.key?.remoteJid || !msg.message) {
    if (isDebugMode()) {
      logger.debug('[BaileysMessageAdapter] Filtered: missing required fields')
    }
    return false
  }

  const jid = msg.key.remoteJid

  // Filter own messages
  if (options.ignoreFromMe && msg.key.fromMe) {
    if (isDebugMode()) {
      logger.debug('[BaileysMessageAdapter] Filtered: message from self')
    }
    return false
  }

  // Filter group messages
  if (options.ignoreGroups && isGroupJid(jid)) {
    if (isDebugMode()) {
      logger.debug('[BaileysMessageAdapter] Filtered: group message')
    }
    return false
  }

  // Filter status broadcasts
  if (options.ignoreStatusBroadcast && isStatusBroadcast(jid)) {
    if (isDebugMode()) {
      logger.debug('[BaileysMessageAdapter] Filtered: status broadcast')
    }
    return false
  }

  // Filter specific JIDs
  if (options.ignoreJids && options.ignoreJids.includes(jid)) {
    if (isDebugMode()) {
      logger.debug('[BaileysMessageAdapter] Filtered: JID in ignore list')
    }
    return false
  }

  if (isDebugMode()) {
    logger.debug('[BaileysMessageAdapter] Message passed filters')
  }

  return true
}

/**
 * Processes an array of Baileys messages and returns normalized messages.
 * 
 * This function handles the common pattern of processing `messages.upsert`
 * events which contain an array of messages.
 * 
 * @param messages - Array of Baileys messages
 * @param options - Filter options
 * @returns Array of normalized IncomingMessage objects
 */
export function processBaileysMessages(
  messages: BaileysWebMessageInfo[],
  options: MessageFilterOptions = DEFAULT_MESSAGE_FILTER_OPTIONS
): IncomingMessage[] {
  if (isDebugMode()) {
    logger.debug('[BaileysMessageAdapter] Processing batch of messages', {
      count: messages.length,
    })
  }

  const normalized: IncomingMessage[] = []

  for (const msg of messages) {
    if (shouldProcessMessage(msg, options)) {
      const normalizedMsg = normalizeBaileysMessage(msg)
      if (normalizedMsg) {
        normalized.push(normalizedMsg)
      }
    }
  }

  if (isDebugMode()) {
    logger.debug('[BaileysMessageAdapter] Batch processing complete', {
      inputCount: messages.length,
      outputCount: normalized.length,
    })
  }

  return normalized
}
