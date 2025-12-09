/**
 * Unit tests for Baileys message adapter.
 * 
 * Tests the normalization logic for Baileys messages to IncomingMessage format.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractChannelId,
  isGroupJid,
  isStatusBroadcast,
  extractTextContent,
  getMessageType,
  normalizeBaileysMessage,
  shouldProcessMessage,
  processBaileysMessages,
  type BaileysWebMessageInfo,
  type BaileysMessageContent,
} from '../../router/src/providers/baileys-message-adapter.js'
import type { MessageFilterOptions } from '../../router/src/core/message-handler.js'

describe('BaileysMessageAdapter', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
    vi.unstubAllEnvs()
  })

  describe('extractChannelId', () => {
    it('should extract phone number from individual JID', () => {
      expect(extractChannelId('5491155551234@s.whatsapp.net')).toBe('5491155551234')
    })

    it('should extract group ID from group JID', () => {
      expect(extractChannelId('120363123456789@g.us')).toBe('120363123456789')
    })

    it('should handle empty string', () => {
      expect(extractChannelId('')).toBe('')
    })

    it('should handle JID without @ symbol', () => {
      expect(extractChannelId('invalidjid')).toBe('invalidjid')
    })

    it('should handle status broadcast', () => {
      expect(extractChannelId('status@broadcast')).toBe('status')
    })
  })

  describe('isGroupJid', () => {
    it('should return true for group JID', () => {
      expect(isGroupJid('120363123456789@g.us')).toBe(true)
    })

    it('should return false for individual JID', () => {
      expect(isGroupJid('5491155551234@s.whatsapp.net')).toBe(false)
    })

    it('should return false for status broadcast', () => {
      expect(isGroupJid('status@broadcast')).toBe(false)
    })
  })

  describe('isStatusBroadcast', () => {
    it('should return true for status broadcast', () => {
      expect(isStatusBroadcast('status@broadcast')).toBe(true)
    })

    it('should return false for individual JID', () => {
      expect(isStatusBroadcast('5491155551234@s.whatsapp.net')).toBe(false)
    })

    it('should return false for group JID', () => {
      expect(isStatusBroadcast('120363123456789@g.us')).toBe(false)
    })
  })

  describe('extractTextContent', () => {
    it('should extract text from conversation message', () => {
      const message: BaileysMessageContent = {
        conversation: 'Hello, world!',
      }
      expect(extractTextContent(message)).toBe('Hello, world!')
    })

    it('should extract text from extended text message', () => {
      const message: BaileysMessageContent = {
        extendedTextMessage: {
          text: 'Extended text message',
        },
      }
      expect(extractTextContent(message)).toBe('Extended text message')
    })

    it('should extract caption from image message', () => {
      const message: BaileysMessageContent = {
        imageMessage: {
          caption: 'Image caption',
        },
      }
      expect(extractTextContent(message)).toBe('Image caption')
    })

    it('should extract caption from video message', () => {
      const message: BaileysMessageContent = {
        videoMessage: {
          caption: 'Video caption',
        },
      }
      expect(extractTextContent(message)).toBe('Video caption')
    })

    it('should extract caption from document message', () => {
      const message: BaileysMessageContent = {
        documentMessage: {
          caption: 'Document caption',
        },
      }
      expect(extractTextContent(message)).toBe('Document caption')
    })

    it('should return placeholder for image without caption', () => {
      const message: BaileysMessageContent = {
        imageMessage: {},
      }
      expect(extractTextContent(message)).toBe('[imageMessage]')
    })

    it('should return empty string for null message', () => {
      expect(extractTextContent(null)).toBe('')
    })

    it('should return empty string for undefined message', () => {
      expect(extractTextContent(undefined)).toBe('')
    })

    it('should prioritize conversation over extendedTextMessage', () => {
      const message: BaileysMessageContent = {
        conversation: 'Simple text',
        extendedTextMessage: {
          text: 'Extended text',
        },
      }
      expect(extractTextContent(message)).toBe('Simple text')
    })
  })

  describe('getMessageType', () => {
    it('should detect conversation message', () => {
      const message: BaileysMessageContent = { conversation: 'Test' }
      expect(getMessageType(message)).toBe('conversation')
    })

    it('should detect extended text message', () => {
      const message: BaileysMessageContent = { extendedTextMessage: { text: 'Test' } }
      expect(getMessageType(message)).toBe('extendedTextMessage')
    })

    it('should detect image message', () => {
      const message: BaileysMessageContent = { imageMessage: {} }
      expect(getMessageType(message)).toBe('imageMessage')
    })

    it('should detect video message', () => {
      const message: BaileysMessageContent = { videoMessage: {} }
      expect(getMessageType(message)).toBe('videoMessage')
    })

    it('should detect audio message', () => {
      const message: BaileysMessageContent = { audioMessage: {} }
      expect(getMessageType(message)).toBe('audioMessage')
    })

    it('should detect document message', () => {
      const message: BaileysMessageContent = { documentMessage: {} }
      expect(getMessageType(message)).toBe('documentMessage')
    })

    it('should detect sticker message', () => {
      const message: BaileysMessageContent = { stickerMessage: {} }
      expect(getMessageType(message)).toBe('stickerMessage')
    })

    it('should detect contact message', () => {
      const message: BaileysMessageContent = { contactMessage: {} }
      expect(getMessageType(message)).toBe('contactMessage')
    })

    it('should detect location message', () => {
      const message: BaileysMessageContent = { locationMessage: {} }
      expect(getMessageType(message)).toBe('locationMessage')
    })

    it('should detect reaction message', () => {
      const message: BaileysMessageContent = { reactionMessage: {} }
      expect(getMessageType(message)).toBe('reactionMessage')
    })

    it('should detect poll creation message', () => {
      const message: BaileysMessageContent = { pollCreationMessage: {} }
      expect(getMessageType(message)).toBe('pollCreationMessage')
    })

    it('should return unknown for empty message', () => {
      const message: BaileysMessageContent = {}
      expect(getMessageType(message)).toBe('unknown')
    })

    it('should return unknown for null', () => {
      expect(getMessageType(null)).toBe('unknown')
    })
  })

  describe('normalizeBaileysMessage', () => {
    it('should normalize a simple text message', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '5491155551234@s.whatsapp.net',
          fromMe: false,
          id: 'ABCD1234',
        },
        message: {
          conversation: 'Hello, world!',
        },
        messageTimestamp: 1700000000,
        pushName: 'John Doe',
      }

      const result = normalizeBaileysMessage(msg)

      expect(result).not.toBeNull()
      expect(result!.id).toBe('ABCD1234')
      expect(result!.from).toBe('5491155551234@s.whatsapp.net')
      expect(result!.channelId).toBe('5491155551234')
      expect(result!.text).toBe('Hello, world!')
      expect(result!.timestamp).toEqual(new Date(1700000000 * 1000))
      expect(result!.metadata?.messageType).toBe('conversation')
      expect(result!.metadata?.fromMe).toBe(false)
      expect(result!.metadata?.isGroup).toBe(false)
      expect(result!.metadata?.pushName).toBe('John Doe')
    })

    it('should normalize a group message', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '120363123456789@g.us',
          fromMe: false,
          id: 'GROUP123',
          participant: '5491155551234@s.whatsapp.net',
        },
        message: {
          conversation: 'Group message',
        },
        messageTimestamp: 1700000000,
      }

      const result = normalizeBaileysMessage(msg)

      expect(result).not.toBeNull()
      expect(result!.metadata?.isGroup).toBe(true)
      expect(result!.metadata?.participant).toBe('5491155551234@s.whatsapp.net')
    })

    it('should normalize an extended text message', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '5491155551234@s.whatsapp.net',
          fromMe: false,
          id: 'EXT123',
        },
        message: {
          extendedTextMessage: {
            text: 'Reply message',
          },
        },
        messageTimestamp: 1700000000,
      }

      const result = normalizeBaileysMessage(msg)

      expect(result).not.toBeNull()
      expect(result!.text).toBe('Reply message')
      expect(result!.metadata?.messageType).toBe('extendedTextMessage')
    })

    it('should return null for message without key', () => {
      const msg: BaileysWebMessageInfo = {
        message: { conversation: 'Test' },
        messageTimestamp: 1700000000,
      }

      expect(normalizeBaileysMessage(msg)).toBeNull()
    })

    it('should return null for message without remoteJid', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          fromMe: false,
          id: 'ABC123',
        },
        message: { conversation: 'Test' },
        messageTimestamp: 1700000000,
      }

      expect(normalizeBaileysMessage(msg)).toBeNull()
    })

    it('should return null for message without id', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '5491155551234@s.whatsapp.net',
          fromMe: false,
        },
        message: { conversation: 'Test' },
        messageTimestamp: 1700000000,
      }

      expect(normalizeBaileysMessage(msg)).toBeNull()
    })

    it('should return null for message without message content', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '5491155551234@s.whatsapp.net',
          fromMe: false,
          id: 'ABC123',
        },
        messageTimestamp: 1700000000,
      }

      expect(normalizeBaileysMessage(msg)).toBeNull()
    })

    it('should handle missing timestamp', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '5491155551234@s.whatsapp.net',
          fromMe: false,
          id: 'ABC123',
        },
        message: { conversation: 'Test' },
      }

      const result = normalizeBaileysMessage(msg)
      expect(result).not.toBeNull()
      expect(result!.timestamp).toBeInstanceOf(Date)
    })

    it('should handle fromMe being true', () => {
      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '5491155551234@s.whatsapp.net',
          fromMe: true,
          id: 'ABC123',
        },
        message: { conversation: 'Test' },
        messageTimestamp: 1700000000,
      }

      const result = normalizeBaileysMessage(msg)
      expect(result).not.toBeNull()
      expect(result!.metadata?.fromMe).toBe(true)
    })
  })

  describe('shouldProcessMessage', () => {
    const validMessage: BaileysWebMessageInfo = {
      key: {
        remoteJid: '5491155551234@s.whatsapp.net',
        fromMe: false,
        id: 'ABC123',
      },
      message: { conversation: 'Test' },
    }

    it('should return true for valid message with default options', () => {
      expect(shouldProcessMessage(validMessage)).toBe(true)
    })

    it('should filter messages from self when ignoreFromMe is true', () => {
      const msg: BaileysWebMessageInfo = {
        ...validMessage,
        key: { ...validMessage.key, fromMe: true },
      }
      const options: MessageFilterOptions = { ignoreFromMe: true }
      expect(shouldProcessMessage(msg, options)).toBe(false)
    })

    it('should not filter messages from self when ignoreFromMe is false', () => {
      const msg: BaileysWebMessageInfo = {
        ...validMessage,
        key: { ...validMessage.key, fromMe: true },
      }
      const options: MessageFilterOptions = { ignoreFromMe: false }
      expect(shouldProcessMessage(msg, options)).toBe(true)
    })

    it('should filter group messages when ignoreGroups is true', () => {
      const msg: BaileysWebMessageInfo = {
        ...validMessage,
        key: { ...validMessage.key, remoteJid: '120363123456789@g.us' },
      }
      const options: MessageFilterOptions = { ignoreGroups: true }
      expect(shouldProcessMessage(msg, options)).toBe(false)
    })

    it('should not filter group messages when ignoreGroups is false', () => {
      const msg: BaileysWebMessageInfo = {
        ...validMessage,
        key: { ...validMessage.key, remoteJid: '120363123456789@g.us' },
      }
      const options: MessageFilterOptions = { ignoreGroups: false }
      expect(shouldProcessMessage(msg, options)).toBe(true)
    })

    it('should filter status broadcast when ignoreStatusBroadcast is true', () => {
      const msg: BaileysWebMessageInfo = {
        ...validMessage,
        key: { ...validMessage.key, remoteJid: 'status@broadcast' },
      }
      const options: MessageFilterOptions = { ignoreStatusBroadcast: true }
      expect(shouldProcessMessage(msg, options)).toBe(false)
    })

    it('should filter specific JIDs', () => {
      const options: MessageFilterOptions = { 
        ignoreJids: ['5491155551234@s.whatsapp.net'] 
      }
      expect(shouldProcessMessage(validMessage, options)).toBe(false)
    })

    it('should return false for message without remoteJid', () => {
      const msg: BaileysWebMessageInfo = {
        key: { fromMe: false, id: 'ABC123' },
        message: { conversation: 'Test' },
      }
      expect(shouldProcessMessage(msg)).toBe(false)
    })

    it('should return false for message without message content', () => {
      const msg: BaileysWebMessageInfo = {
        key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'ABC123' },
      }
      expect(shouldProcessMessage(msg)).toBe(false)
    })
  })

  describe('processBaileysMessages', () => {
    it('should process an array of messages', () => {
      const messages: BaileysWebMessageInfo[] = [
        {
          key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'MSG1' },
          message: { conversation: 'Message 1' },
          messageTimestamp: 1700000000,
        },
        {
          key: { remoteJid: '5491155559999@s.whatsapp.net', fromMe: false, id: 'MSG2' },
          message: { conversation: 'Message 2' },
          messageTimestamp: 1700000001,
        },
      ]

      const result = processBaileysMessages(messages)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('MSG1')
      expect(result[1].id).toBe('MSG2')
    })

    it('should filter out own messages with default options', () => {
      const messages: BaileysWebMessageInfo[] = [
        {
          key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'MSG1' },
          message: { conversation: 'From other' },
          messageTimestamp: 1700000000,
        },
        {
          key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: true, id: 'MSG2' },
          message: { conversation: 'From self' },
          messageTimestamp: 1700000001,
        },
      ]

      const result = processBaileysMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('MSG1')
    })

    it('should return empty array when all messages are filtered', () => {
      const messages: BaileysWebMessageInfo[] = [
        {
          key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: true, id: 'MSG1' },
          message: { conversation: 'From self' },
          messageTimestamp: 1700000000,
        },
      ]

      const result = processBaileysMessages(messages)

      expect(result).toHaveLength(0)
    })

    it('should handle empty array', () => {
      const result = processBaileysMessages([])
      expect(result).toHaveLength(0)
    })

    it('should filter invalid messages', () => {
      const messages: BaileysWebMessageInfo[] = [
        {
          key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'VALID' },
          message: { conversation: 'Valid' },
          messageTimestamp: 1700000000,
        },
        {
          key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false },
          message: { conversation: 'No ID' },
          messageTimestamp: 1700000001,
        },
        {
          key: { fromMe: false, id: 'NO_JID' },
          message: { conversation: 'No JID' },
          messageTimestamp: 1700000002,
        },
      ]

      const result = processBaileysMessages(messages)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('VALID')
    })

    it('should apply custom filter options', () => {
      const messages: BaileysWebMessageInfo[] = [
        {
          key: { remoteJid: '120363123456789@g.us', fromMe: false, id: 'GROUP' },
          message: { conversation: 'Group message' },
          messageTimestamp: 1700000000,
        },
        {
          key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'DM' },
          message: { conversation: 'Direct message' },
          messageTimestamp: 1700000001,
        },
      ]

      const options: MessageFilterOptions = { ignoreGroups: true, ignoreFromMe: false }
      const result = processBaileysMessages(messages, options)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('DM')
    })
  })

  describe('debug logging', () => {
    it('should log debug messages when WA2AI_DEBUG is true', () => {
      vi.stubEnv('WA2AI_DEBUG', 'true')

      const msg: BaileysWebMessageInfo = {
        key: {
          remoteJid: '5491155551234@s.whatsapp.net',
          fromMe: false,
          id: 'DEBUG123',
        },
        message: { conversation: 'Test' },
        messageTimestamp: 1700000000,
      }

      normalizeBaileysMessage(msg)

      // Debug logs should have been called
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })
})
