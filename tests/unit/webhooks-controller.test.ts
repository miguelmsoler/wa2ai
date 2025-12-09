import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { registerWebhooks } from '../../router/src/webhooks-controller.js'

describe('WebhooksController', () => {
  let mockApp: FastifyInstance
  let mockRequest: FastifyRequest
  let mockReply: FastifyReply
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as any

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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Received event: messages.upsert from instance: wa2ai-test'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Message received from 5493777239922@s.whatsapp.net: Hello, this is a test message'
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Message received from 5493777239922@s.whatsapp.net: This is an extended text message'
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Message received from 5493777239922@s.whatsapp.net: This is an image caption'
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Message received from 5493777239922@s.whatsapp.net: [media or unsupported message type]'
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Received event: connection.update from instance: wa2ai-test'
      )
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[Webhook] Message received')
      )
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Received event: qrcode.updated from instance: wa2ai-test'
      )
    })

    it('should handle webhook with unknown format', async () => {
      const handler = (mockApp as any).labHandler
      const payload = {
        unknownField: 'unknown value',
      }

      mockRequest.body = payload

      await handler(mockRequest, mockReply)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Received webhook with unknown format:',
        payload
      )
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should log full payload in debug mode when WA2AI_DEBUG=true', async () => {
      // Set DEBUG modehttps://github.com/EvolutionAPI/evolution-api/releases/tag/2.3.7
      process.env.WA2AI_DEBUG = 'true'
      
      // Re-register webhooks to pick up new DEBUG value
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

      // Verify INFO level logging (always present)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Received event: messages.upsert from instance: wa2ai-test'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Message received from 5493777239922@s.whatsapp.net: Test message'
      )
      
      // Verify DEBUG level logging (only in debug mode)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Full payload:',
        JSON.stringify(payload, null, 2)
      )
      
      expect(mockReply.code).toHaveBeenCalledWith(200)
    })

    it('should NOT log full payload in production mode when WA2AI_DEBUG=false', async () => {
      // Set production mode
      process.env.WA2AI_DEBUG = 'false'
      
      // Re-register webhooks to pick up new DEBUG value
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

      // Verify INFO level logging (always present)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Received event: messages.upsert from instance: wa2ai-test'
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Message received from 5493777239922@s.whatsapp.net: Test message'
      )
      
      // Verify DEBUG level logging is NOT present
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        '[Webhook] Full payload:',
        expect.any(String)
      )
      
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

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Webhook] Received event: messages.upsert from instance: wa2ai-test'
      )
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[Webhook] Message received')
      )
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

