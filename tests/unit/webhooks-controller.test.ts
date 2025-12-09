import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { registerWebhooks } from '../../router/src/webhooks-controller.js'
import * as webhookAdapter from '../../router/src/core/webhook-adapter.js'

/**
 * Helper to parse structured log entries from console.log calls.
 */
function parseLogEntry(call: unknown[]): { level: string; message: string; context?: Record<string, unknown> } | null {
  if (call.length === 0) return null
  const logString = call[0] as string
  try {
    return JSON.parse(logString)
  } catch {
    return null
  }
}

/**
 * Helper to check if a log entry contains a specific message.
 */
function logContainsMessage(calls: unknown[][], message: string): boolean {
  return calls.some(call => {
    const entry = parseLogEntry(call)
    return entry?.message === message || entry?.message?.includes(message)
  })
}

/**
 * Helper to check if a log entry contains specific context.
 */
function logContainsContext(calls: unknown[][], contextKey: string, contextValue: unknown): boolean {
  return calls.some(call => {
    const entry = parseLogEntry(call)
    return entry?.context && entry.context[contextKey] === contextValue
  })
}

describe('WebhooksController', () => {
  let mockApp: FastifyInstance
  let mockRequest: FastifyRequest
  let mockReply: FastifyReply
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Mock console.log and console.warn
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as any
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as any
    
    // Mock webhook adapter
    vi.spyOn(webhookAdapter, 'normalizeEvolutionApiWebhook').mockImplementation((payload: unknown) => {
      const p = payload as { event?: string; instance?: string; data?: unknown }
      if (p.event === 'messages.upsert' && p.data) {
        const msg = p.data as { key?: { remoteJid?: string; id?: string }; from?: string; message?: { conversation?: string; extendedTextMessage?: { text?: string }; imageMessage?: { caption?: string } } }
        return {
          id: msg.key?.id || 'test-id',
          from: msg.key?.remoteJid || msg.from || 'unknown',
          channelId: (msg.key?.remoteJid || msg.from || 'unknown').split('@')[0],
          text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '[media or unsupported message type]',
          timestamp: new Date(),
        }
      }
      return null
    })

    // Mock FastifyReply
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply

    // Mock FastifyRequest
    mockRequest = {
      body: {},
      headers: {},
    } as unknown as FastifyRequest

    // Mock FastifyInstance
    mockApp = {
      post: vi.fn((route: string, handler: any) => {
        if (route === '/webhooks/whatsapp/lab') {
          // Store handler for testing
          ;(mockApp as any).labHandler = handler
        }
      }),
      get: vi.fn((route: string, handler: any) => {
        if (route === '/health') {
          ;(mockApp as any).healthHandler = handler
        }
      }),
    } as unknown as FastifyInstance

    // Reset environment variable to default (false)
    process.env.WA2AI_DEBUG = 'false'
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('registerWebhooks', () => {
    it('should register webhook endpoints', () => {
      registerWebhooks(mockApp)

      expect(mockApp.post).toHaveBeenCalledWith(
        '/webhooks/whatsapp/lab',
        expect.any(Function)
      )
      expect(mockApp.post).toHaveBeenCalledWith(
        '/webhooks/whatsapp/prod',
        expect.any(Function)
      )
      expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function))
    })
  })

  describe('/webhooks/whatsapp/lab', () => {
    beforeEach(() => {
      registerWebhooks(mockApp)
    })

    it('should handle messages.upsert event with correct Evolution API format', async () => {
      const handler = (mockApp as any).labHandler
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
        destination: 'http://localhost:3000/webhooks/whatsapp/lab',
        date_time: '2025-12-08T23:50:00.000Z',
        sender: '5493777239922@s.whatsapp.net',
        server_url: 'http://evolution-api-lab:8080',
        apikey: 'test-key',
      }

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ok',
        received: true,
      })
    })

    it('should handle messages.upsert with extended text message', async () => {
      const handler = (mockApp as any).labHandler
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

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should handle messages.upsert with image message', async () => {
      const handler = (mockApp as any).labHandler
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

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should handle messages.upsert with unsupported message type', async () => {
      const handler = (mockApp as any).labHandler
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

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should handle connection.update event', async () => {
      const handler = (mockApp as any).labHandler
      const payload = {
        event: 'connection.update',
        instance: 'wa2ai-test',
        data: {
          instance: 'wa2ai-test',
          state: 'open',
          statusReason: 200,
        },
      }

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      // Adapter returns null for non-message events
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should handle qrcode.updated event', async () => {
      const handler = (mockApp as any).labHandler
      const payload = {
        event: 'qrcode.updated',
        instance: 'wa2ai-test',
        data: {
          qrcode: {
            base64: 'data:image/png;base64,...',
          },
        },
      }

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should handle webhook with unknown format', async () => {
      const handler = (mockApp as any).labHandler
      const payload = {
        unknownField: 'unknown value',
      }

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should log debug information when WA2AI_DEBUG=true', async () => {
      process.env.WA2AI_DEBUG = 'true'
      
      // Re-register webhooks to pick up new DEBUG value
      // Re-mock adapter before re-registering
      vi.spyOn(webhookAdapter, 'normalizeEvolutionApiWebhook').mockImplementation((payload: unknown) => {
        const p = payload as { event?: string; instance?: string; data?: unknown }
        if (p.event === 'messages.upsert' && p.data) {
          const msg = p.data as { key?: { remoteJid?: string; id?: string }; from?: string; message?: { conversation?: string } }
          return {
            id: msg.key?.id || 'test-id',
            from: msg.key?.remoteJid || msg.from || 'unknown',
            channelId: (msg.key?.remoteJid || msg.from || 'unknown').split('@')[0],
            text: msg.message?.conversation || '[media or unsupported message type]',
            timestamp: new Date(),
          }
        }
        return null
      })
      
      registerWebhooks(mockApp)
      
      const handler = (mockApp as any).labHandler
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

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should handle webhook in production mode when WA2AI_DEBUG=false', async () => {
      process.env.WA2AI_DEBUG = 'false'
      
      // Re-register webhooks to pick up new DEBUG value
      // Re-mock adapter before re-registering
      vi.spyOn(webhookAdapter, 'normalizeEvolutionApiWebhook').mockImplementation((payload: unknown) => {
        const p = payload as { event?: string; instance?: string; data?: unknown }
        if (p.event === 'messages.upsert' && p.data) {
          const msg = p.data as { key?: { remoteJid?: string; id?: string }; from?: string; message?: { conversation?: string } }
          return {
            id: msg.key?.id || 'test-id',
            from: msg.key?.remoteJid || msg.from || 'unknown',
            channelId: (msg.key?.remoteJid || msg.from || 'unknown').split('@')[0],
            text: msg.message?.conversation || '[media or unsupported message type]',
            timestamp: new Date(),
          }
        }
        return null
      })
      
      registerWebhooks(mockApp)
      
      const handler = (mockApp as any).labHandler
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

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should handle messages.upsert with missing data', async () => {
      const handler = (mockApp as any).labHandler
      const payload = {
        event: 'messages.upsert',
        instance: 'wa2ai-test',
        // data is missing
      }

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(webhookAdapter.normalizeEvolutionApiWebhook).toHaveBeenCalledWith(payload)
      // Adapter returns null when data is missing
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })
  })

  describe('/health', () => {
    beforeEach(() => {
      registerWebhooks(mockApp)
    })

    it('should return healthy status', async () => {
      const handler = (mockApp as any).healthHandler

      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith({ status: 'healthy' })
    })
  })
})

