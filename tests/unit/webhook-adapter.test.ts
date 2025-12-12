/**
 * Unit tests for webhook adapter.
 * 
 * Tests the normalization logic for Evolution API webhook payloads
 * directly in the webhook-adapter module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeEvolutionApiWebhook } from '../../router/src/core/webhook-adapter.js'
import { logger } from '../../router/src/core/logger.js'

// Mock logger
vi.mock('../../router/src/core/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  isDebugMode: vi.fn(() => false),
}))

describe('WebhookAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('normalizeEvolutionApiWebhook', () => {
    it('should normalize messages.upsert event with conversation message', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Hello, this is a test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('test123')
      expect(result?.from).toBe('5493777239922@s.whatsapp.net')
      expect(result?.channelId).toBe('5493777239922')
      expect(result?.text).toBe('Hello, this is a test message')
      expect(result?.timestamp).toBeInstanceOf(Date)
      expect(result?.timestamp.getTime()).toBe(1234567890 * 1000)
      expect(result?.metadata?.instance).toBe('wa2ai-test')
      expect(result?.metadata?.eventType).toBe('messages.upsert')
    })

    it('should normalize messages.upsert event with extended text message', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test456',
          },
          message: {
            extendedTextMessage: {
              text: 'This is an extended text message',
            },
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.text).toBe('This is an extended text message')
    })

    it('should normalize messages.upsert event with image message caption', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test789',
          },
          message: {
            imageMessage: {
              caption: 'This is an image caption',
            },
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.text).toBe('This is an image caption')
    })

    it('should normalize messages.upsert event with unsupported message type', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test999',
          },
          message: {
            videoMessage: {},
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.text).toBe('[media or unsupported message type]')
    })

    it('should extract channel ID from group JID (full JID for groups)', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '120363123456789012@g.us',
            fromMe: false,
            id: 'test-group',
          },
          message: {
            conversation: 'Group message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.channelId).toBe('120363123456789012@g.us')
    })

    it('should extract channel ID from individual chat JID (phone number only)', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Individual message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.channelId).toBe('5493777239922')
    })

    it('should handle JID without @s.whatsapp.net suffix', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.channelId).toBe('5493777239922')
    })

    it('should use from field if remoteJid is missing', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          from: '5493777239922@s.whatsapp.net',
          message: {
            conversation: 'Test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.from).toBe('5493777239922@s.whatsapp.net')
      expect(result?.channelId).toBe('5493777239922')
    })

    it('should use unknown as fallback if both remoteJid and from are missing', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          message: {
            conversation: 'Test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.from).toBe('unknown')
      expect(result?.channelId).toBe('unknown')
    })

    it('should generate message ID if key.id is missing', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
          },
          message: {
            conversation: 'Test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.id).toMatch(/^msg-\d+$/)
    })

    it('should use current date if messageTimestamp is missing', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Test message',
          },
        },
      }

      const before = new Date()
      const result = normalizeEvolutionApiWebhook(payload)
      const after = new Date()

      expect(result).not.toBeNull()
      expect(result?.timestamp).toBeInstanceOf(Date)
      expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result?.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should return null for non-messages.upsert events', () => {
      const payload = {
        event: 'connection.update',
        instance: 'wa2ai-test',
        data: {
          state: 'open',
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).toBeNull()
      expect(logger.info).toHaveBeenCalled()
    })

    it('should return null for messages.upsert event without data', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        // data is missing
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('messages.upsert event has no data'),
        expect.any(Object)
      )
    })

    it('should return null for webhook without event type', () => {
      const payload = {
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
          },
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Received webhook with unknown format'),
        expect.any(Object)
      )
    })

    it('should return null for completely invalid payload', () => {
      const payload = {
        unknownField: 'unknown value',
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).toBeNull()
    })

    it('should return null for null payload', () => {
      const result = normalizeEvolutionApiWebhook(null)

      expect(result).toBeNull()
    })

    it('should return null for undefined payload', () => {
      const result = normalizeEvolutionApiWebhook(undefined)

      expect(result).toBeNull()
    })

    it('should include raw message in metadata', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Test message',
            someOtherField: 'value',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.metadata?.rawMessage).toEqual(payload.data.message)
    })

    it('should handle instance name from payload', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'custom-instance',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.metadata?.instance).toBe('custom-instance')
    })

    it('should use unknown as default instance if missing', () => {
      const payload = {
        event: 'messages.upsert',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.metadata?.instance).toBe('unknown')
    })

    it('should handle JID with non-numeric prefix for individual chats', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: 'abc123@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {
            conversation: 'Test message',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      // Should return the full JID if no numeric match
      expect(result?.channelId).toBe('abc123@s.whatsapp.net')
    })

    it('should handle empty message object', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          message: {},
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.text).toBe('[media or unsupported message type]')
    })

    it('should handle missing message object', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        data: {
          key: {
            remoteJid: '5493777239922@s.whatsapp.net',
            fromMe: false,
            id: 'test123',
          },
          messageTimestamp: 1234567890,
        },
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).not.toBeNull()
      expect(result?.text).toBe('[media or unsupported message type]')
    })
  })
})
