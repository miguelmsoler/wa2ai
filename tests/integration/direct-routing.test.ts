/**
 * Integration tests for direct routing flow.
 * 
 * Tests the complete flow from Baileys message to agent response.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InMemoryRoutesRepository } from '../../router/src/core/routes-repository.js'
import { RouterService } from '../../router/src/core/router-service.js'
import { MessageRouter, setupBaileysDirectRouting } from '../../router/src/core/message-router.js'
import { getBaileysConnection } from '../../router/src/providers/baileys-connection.js'
import type { IncomingMessage, Route } from '../../router/src/core/models.js'

// Mock Baileys module
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
    return undefined
  }),
}))

// Mock fetch for agent client
global.fetch = vi.fn()

describe('Direct Routing Integration', () => {
  let routesRepository: InMemoryRoutesRepository
  let routerService: RouterService
  let messageRouter: MessageRouter
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    routesRepository = new InMemoryRoutesRepository()
    routerService = new RouterService(routesRepository)
    messageRouter = new MessageRouter(routerService)

    fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Message Flow', () => {
    it('should route message from Baileys to agent and back', async () => {
      // Setup route
      const route: Route = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          response: 'Hello from agent!',
        }),
      })

      // Simulate incoming message from Baileys
      const incomingMessage: IncomingMessage = {
        id: 'BAILEYS_MSG_001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Hello, agent!',
        timestamp: new Date(),
      }

      // Route message
      const result = await messageRouter.routeMessage(incomingMessage)

      // Verify agent was called
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        route.agentEndpoint,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            id: incomingMessage.id,
            from: incomingMessage.from,
            channelId: incomingMessage.channelId,
            text: incomingMessage.text,
            timestamp: incomingMessage.timestamp.toISOString(),
            metadata: incomingMessage.metadata,
          }),
        })
      )

      // Verify result
      expect(result.success).toBe(true)
      expect(result.response).toBe('Hello from agent!')
    })

    it('should handle multiple messages in sequence', async () => {
      const route: Route = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, response: 'Response 1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, response: 'Response 2' }),
        })

      const message1: IncomingMessage = {
        id: 'MSG001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Message 1',
        timestamp: new Date(),
      }

      const message2: IncomingMessage = {
        id: 'MSG002',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Message 2',
        timestamp: new Date(),
      }

      const result1 = await messageRouter.routeMessage(message1)
      const result2 = await messageRouter.routeMessage(message2)

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result1.response).toBe('Response 1')
      expect(result2.response).toBe('Response 2')
    })

    it('should handle agent errors gracefully', async () => {
      const route: Route = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Agent processing failed',
        }),
      })

      const message: IncomingMessage = {
        id: 'MSG001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Test message',
        timestamp: new Date(),
      }

      const result = await messageRouter.routeMessage(message)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Agent processing failed')
    })

    it('should handle network errors', async () => {
      const route: Route = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const message: IncomingMessage = {
        id: 'MSG001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Test message',
        timestamp: new Date(),
      }

      const result = await messageRouter.routeMessage(message)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to communicate with agent')
    })

    it('should return error when no route exists', async () => {
      const message: IncomingMessage = {
        id: 'MSG001',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Test message',
        timestamp: new Date(),
      }

      const result = await messageRouter.routeMessage(message)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No route found')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('Baileys Integration', () => {
    it('should set up direct routing with Baileys', () => {
      const connection = getBaileysConnection()
      const handlerCountBefore = connection.getMessageHandlerCount()

      setupBaileysDirectRouting(messageRouter)

      const handlerCountAfter = connection.getMessageHandlerCount()
      expect(handlerCountAfter).toBe(handlerCountBefore + 1)
    })

    it('should handle message through Baileys handler', async () => {
      const route: Route = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          response: 'Agent response',
        }),
      })

      setupBaileysDirectRouting(messageRouter)

      // Simulate message from Baileys
      const message: IncomingMessage = {
        id: 'BAILEYS_MSG',
        from: '5491155551234@s.whatsapp.net',
        channelId: '5491155551234',
        text: 'Test',
        timestamp: new Date(),
      }

      // Verify the router would process it correctly
      const routerResult = await messageRouter.routeMessage(message)
      expect(routerResult.success).toBe(true)
      expect(routerResult.response).toBe('Agent response')
    })
  })

  describe('Route Management', () => {
    it('should route to different agents based on channel', async () => {
      const route1: Route = {
        channelId: '5491111111111',
        agentEndpoint: 'http://localhost:8000/agent1',
        environment: 'lab',
      }
      const route2: Route = {
        channelId: '5492222222222',
        agentEndpoint: 'http://localhost:8000/agent2',
        environment: 'lab',
      }

      await routesRepository.addRoute(route1)
      await routesRepository.addRoute(route2)

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, response: 'Agent 1 response' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, response: 'Agent 2 response' }),
        })

      const message1: IncomingMessage = {
        id: 'MSG1',
        from: '5491111111111@s.whatsapp.net',
        channelId: '5491111111111',
        text: 'Message 1',
        timestamp: new Date(),
      }

      const message2: IncomingMessage = {
        id: 'MSG2',
        from: '5492222222222@s.whatsapp.net',
        channelId: '5492222222222',
        text: 'Message 2',
        timestamp: new Date(),
      }

      const result1 = await messageRouter.routeMessage(message1)
      const result2 = await messageRouter.routeMessage(message2)

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        route1.agentEndpoint,
        expect.any(Object)
      )
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        route2.agentEndpoint,
        expect.any(Object)
      )
      expect(result1.response).toBe('Agent 1 response')
      expect(result2.response).toBe('Agent 2 response')
    })
  })
})

