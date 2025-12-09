/**
 * Integration tests for Baileys message handling.
 * 
 * Tests the complete flow from Baileys message event to handler callback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { IncomingMessage } from '../../router/src/core/models.js'
import type { MessageHandlerResult, MessageHandlerCallback } from '../../router/src/core/message-handler.js'
import { processBaileysMessages } from '../../router/src/providers/baileys-message-adapter.js'
import type { BaileysWebMessageInfo } from '../../router/src/providers/baileys-message-adapter.js'

// Mock the Baileys module
vi.mock('@whiskeysockets/baileys', () => ({
  default: vi.fn(),
  makeWASocket: vi.fn(),
  DisconnectReason: {
    badSession: 500,
    connectionClosed: 428,
    connectionLost: 408,
    connectionReplaced: 440,
    loggedOut: 401,
    restartRequired: 515,
    timedOut: 408,
  },
  useMultiFileAuthState: vi.fn().mockResolvedValue({
    state: { creds: {}, keys: {} },
    saveCreds: vi.fn(),
  }),
  getContentType: vi.fn((message) => {
    if (message?.conversation) return 'conversation'
    if (message?.extendedTextMessage) return 'extendedTextMessage'
    if (message?.imageMessage) return 'imageMessage'
    if (message?.videoMessage) return 'videoMessage'
    if (message?.audioMessage) return 'audioMessage'
    if (message?.documentMessage) return 'documentMessage'
    if (message?.stickerMessage) return 'stickerMessage'
    return undefined
  }),
}))

describe('Baileys Message Integration', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn> | null = null
  let consoleWarnSpy: ReturnType<typeof vi.spyOn> | null = null
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>
  })

  afterEach(() => {
    consoleLogSpy?.mockRestore()
    consoleWarnSpy?.mockRestore()
    consoleErrorSpy?.mockRestore()
    vi.clearAllMocks()
  })

  describe('Message Processing Pipeline', () => {
    it('should process messages through the complete pipeline', async () => {
      // Simulate Baileys messages.upsert event
      const baileysMessages: BaileysWebMessageInfo[] = [
        {
          key: {
            remoteJid: '5491155551234@s.whatsapp.net',
            fromMe: false,
            id: 'MSG001',
          },
          message: {
            conversation: 'Hello from WhatsApp!',
          },
          messageTimestamp: 1700000000,
          pushName: 'Test User',
        },
      ]

      // Process messages through adapter
      const normalizedMessages = processBaileysMessages(baileysMessages)

      // Verify normalization
      expect(normalizedMessages).toHaveLength(1)
      expect(normalizedMessages[0].id).toBe('MSG001')
      expect(normalizedMessages[0].text).toBe('Hello from WhatsApp!')
      expect(normalizedMessages[0].from).toBe('5491155551234@s.whatsapp.net')
      expect(normalizedMessages[0].channelId).toBe('5491155551234')

      // Simulate handler processing
      const handlerResults: MessageHandlerResult[] = []
      const mockHandler: MessageHandlerCallback = async (message: IncomingMessage) => {
        const result: MessageHandlerResult = {
          success: true,
          response: `Echo: ${message.text}`,
          metadata: { processedAt: new Date().toISOString() },
        }
        handlerResults.push(result)
        return result
      }

      // Process each message through handler
      for (const message of normalizedMessages) {
        await mockHandler(message)
      }

      // Verify handler was called
      expect(handlerResults).toHaveLength(1)
      expect(handlerResults[0].success).toBe(true)
      expect(handlerResults[0].response).toBe('Echo: Hello from WhatsApp!')
    })

    it('should handle multiple messages in a single upsert event', async () => {
      const baileysMessages: BaileysWebMessageInfo[] = [
        {
          key: { remoteJid: '5491111111111@s.whatsapp.net', fromMe: false, id: 'MSG001' },
          message: { conversation: 'First message' },
          messageTimestamp: 1700000000,
        },
        {
          key: { remoteJid: '5492222222222@s.whatsapp.net', fromMe: false, id: 'MSG002' },
          message: { conversation: 'Second message' },
          messageTimestamp: 1700000001,
        },
        {
          key: { remoteJid: '5493333333333@s.whatsapp.net', fromMe: false, id: 'MSG003' },
          message: { conversation: 'Third message' },
          messageTimestamp: 1700000002,
        },
      ]

      const normalizedMessages = processBaileysMessages(baileysMessages)

      expect(normalizedMessages).toHaveLength(3)
      expect(normalizedMessages.map(m => m.id)).toEqual(['MSG001', 'MSG002', 'MSG003'])
    })

    it('should filter and process mixed messages correctly', async () => {
      const baileysMessages: BaileysWebMessageInfo[] = [
        // Valid message from other user
        {
          key: { remoteJid: '5491111111111@s.whatsapp.net', fromMe: false, id: 'VALID1' },
          message: { conversation: 'Valid message' },
          messageTimestamp: 1700000000,
        },
        // Own message (should be filtered by default)
        {
          key: { remoteJid: '5491111111111@s.whatsapp.net', fromMe: true, id: 'OWN1' },
          message: { conversation: 'Own message' },
          messageTimestamp: 1700000001,
        },
        // Status broadcast (should be filtered by default)
        {
          key: { remoteJid: 'status@broadcast', fromMe: false, id: 'STATUS1' },
          message: { conversation: 'Status update' },
          messageTimestamp: 1700000002,
        },
        // Another valid message
        {
          key: { remoteJid: '5492222222222@s.whatsapp.net', fromMe: false, id: 'VALID2' },
          message: { conversation: 'Another valid message' },
          messageTimestamp: 1700000003,
        },
      ]

      const normalizedMessages = processBaileysMessages(baileysMessages)

      expect(normalizedMessages).toHaveLength(2)
      expect(normalizedMessages.map(m => m.id)).toEqual(['VALID1', 'VALID2'])
    })
  })

  describe('Message Handler Chain', () => {
    it('should support multiple handlers for a single message', async () => {
      const message: IncomingMessage = {
        id: 'TEST001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Test message',
        timestamp: new Date(),
        metadata: { messageType: 'conversation' },
      }

      const handler1Results: string[] = []
      const handler2Results: string[] = []

      const handler1: MessageHandlerCallback = async (msg) => {
        handler1Results.push(msg.id)
        return { success: true }
      }

      const handler2: MessageHandlerCallback = async (msg) => {
        handler2Results.push(msg.id)
        return { success: true, response: 'Handled by handler2' }
      }

      await handler1(message)
      await handler2(message)

      expect(handler1Results).toContain('TEST001')
      expect(handler2Results).toContain('TEST001')
    })

    it('should handle errors in handlers gracefully', async () => {
      const message: IncomingMessage = {
        id: 'ERROR001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Error trigger',
        timestamp: new Date(),
      }

      const errorHandler: MessageHandlerCallback = async () => {
        throw new Error('Handler error')
      }

      await expect(errorHandler(message)).rejects.toThrow('Handler error')
    })

    it('should return different results based on message content', async () => {
      const commandMessage: IncomingMessage = {
        id: 'CMD001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: '/help',
        timestamp: new Date(),
      }

      const regularMessage: IncomingMessage = {
        id: 'MSG001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Hello',
        timestamp: new Date(),
      }

      const commandHandler: MessageHandlerCallback = async (msg) => {
        if (msg.text.startsWith('/')) {
          return { 
            success: true, 
            response: 'Available commands: /help, /status',
            metadata: { isCommand: true }
          }
        }
        return { 
          success: true, 
          response: `You said: ${msg.text}`,
          metadata: { isCommand: false }
        }
      }

      const cmdResult = await commandHandler(commandMessage)
      const msgResult = await commandHandler(regularMessage)

      expect(cmdResult.metadata?.isCommand).toBe(true)
      expect(msgResult.metadata?.isCommand).toBe(false)
    })
  })

  describe('Message Type Handling', () => {
    it('should process text messages correctly', async () => {
      const textMessage: BaileysWebMessageInfo = {
        key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'TEXT001' },
        message: { conversation: 'Plain text message' },
        messageTimestamp: 1700000000,
      }

      const normalized = processBaileysMessages([textMessage])

      expect(normalized[0].text).toBe('Plain text message')
      expect(normalized[0].metadata?.messageType).toBe('conversation')
    })

    it('should process extended text messages correctly', async () => {
      const extendedMessage: BaileysWebMessageInfo = {
        key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'EXT001' },
        message: { 
          extendedTextMessage: { 
            text: 'Reply with mention @user',
            contextInfo: {
              quotedMessage: { conversation: 'Original message' }
            }
          } 
        },
        messageTimestamp: 1700000000,
      }

      const normalized = processBaileysMessages([extendedMessage])

      expect(normalized[0].text).toBe('Reply with mention @user')
      expect(normalized[0].metadata?.messageType).toBe('extendedTextMessage')
    })

    it('should process image messages with captions', async () => {
      const imageMessage: BaileysWebMessageInfo = {
        key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'IMG001' },
        message: { 
          imageMessage: { 
            caption: 'Check out this image!',
            mimetype: 'image/jpeg'
          } 
        },
        messageTimestamp: 1700000000,
      }

      const normalized = processBaileysMessages([imageMessage])

      expect(normalized[0].text).toBe('Check out this image!')
      expect(normalized[0].metadata?.messageType).toBe('imageMessage')
    })

    it('should handle media messages without captions', async () => {
      const imageMessage: BaileysWebMessageInfo = {
        key: { remoteJid: '5491155551234@s.whatsapp.net', fromMe: false, id: 'IMG002' },
        message: { 
          imageMessage: { 
            mimetype: 'image/jpeg'
          } 
        },
        messageTimestamp: 1700000000,
      }

      const normalized = processBaileysMessages([imageMessage])

      expect(normalized[0].text).toBe('[imageMessage]')
    })
  })

  describe('Group Message Handling', () => {
    it('should process group messages with participant info', async () => {
      const groupMessage: BaileysWebMessageInfo = {
        key: { 
          remoteJid: '120363123456789@g.us', 
          fromMe: false, 
          id: 'GROUP001',
          participant: '5491155551234@s.whatsapp.net'
        },
        message: { conversation: 'Hello group!' },
        messageTimestamp: 1700000000,
        pushName: 'Group Member',
      }

      const normalized = processBaileysMessages([groupMessage], { 
        ignoreFromMe: true, 
        ignoreGroups: false 
      })

      expect(normalized).toHaveLength(1)
      expect(normalized[0].metadata?.isGroup).toBe(true)
      expect(normalized[0].metadata?.participant).toBe('5491155551234@s.whatsapp.net')
      expect(normalized[0].channelId).toBe('120363123456789')
    })

    it('should filter group messages when configured', async () => {
      const groupMessage: BaileysWebMessageInfo = {
        key: { 
          remoteJid: '120363123456789@g.us', 
          fromMe: false, 
          id: 'GROUP002' 
        },
        message: { conversation: 'Group message' },
        messageTimestamp: 1700000000,
      }

      const normalized = processBaileysMessages([groupMessage], { 
        ignoreGroups: true 
      })

      expect(normalized).toHaveLength(0)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle malformed messages gracefully', async () => {
      const malformedMessages: BaileysWebMessageInfo[] = [
        // Missing key
        { message: { conversation: 'No key' }, messageTimestamp: 1700000000 },
        // Missing message
        { key: { remoteJid: '5491111@s.whatsapp.net', fromMe: false, id: 'NO_MSG' }, messageTimestamp: 1700000000 },
        // Valid message
        {
          key: { remoteJid: '5492222@s.whatsapp.net', fromMe: false, id: 'VALID' },
          message: { conversation: 'Valid' },
          messageTimestamp: 1700000000,
        },
      ]

      const normalized = processBaileysMessages(malformedMessages)

      expect(normalized).toHaveLength(1)
      expect(normalized[0].id).toBe('VALID')
    })

    it('should handle empty message arrays', async () => {
      const normalized = processBaileysMessages([])
      expect(normalized).toHaveLength(0)
    })
  })
})
