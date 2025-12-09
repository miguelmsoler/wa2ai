/**
 * Unit tests for webhook adapter.
 * 
 * Tests the normalization logic for Evolution API webhook payloads.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { normalizeEvolutionApiWebhook } from '../../router/src/core/webhook-adapter.js'
import * as logger from '../../router/src/core/logger.js'

describe('WebhookAdapter', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Mock console.log and console.warn
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as any
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as any
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
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

    it('should extract channel ID from group JID', () => {
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
    })

    it('should return null for messages.upsert event without data', () => {
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        // data is missing
      }

      const result = normalizeEvolutionApiWebhook(payload)

      expect(result).toBeNull()
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
    })

    it('should return null for completely invalid payload', () => {
      const payload = {
        unknownField: 'unknown value',
      }

      const result = normalizeEvolutionApiWebhook(payload)

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
  })
})

