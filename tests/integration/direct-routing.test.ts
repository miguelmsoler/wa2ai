/**
 * Integration tests for direct routing flow.
 * 
 * Tests the complete flow from Baileys message to agent response.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InMemoryRoutesRepository } from '../../router/src/core/routes-repository.js'
import { RouterService } from '../../router/src/core/router-service.js'
import { MessageRouter } from '../../router/src/core/message-router.js'
import { BaileysProvider } from '../../router/src/providers/baileys-provider.js'
import { HttpAgentClient } from '../../router/src/infra/http-agent-client.js'
import { setupBaileysDirectRouting } from '../../router/src/providers/baileys-routing.js'
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
    
    // Create agent client
    const agentClient = new HttpAgentClient({
      timeout: 30000,
      adk: {
        appName: 'test_agent',
        baseUrl: 'http://localhost:8000',
      },
    })
    
    // Create BaileysProvider for message router
    const baileysProvider = new BaileysProvider()
    messageRouter = new MessageRouter(
      routerService,
      agentClient,
      {
        whatsappProvider: baileysProvider,
      }
    )

    fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Message Flow', () => {
    it('should route message from Baileys to agent and back', async () => {
      // Setup route with ADK config
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        config: {
          adk: {
            appName: 'test_agent',
            baseUrl: 'http://localhost:8000',
          },
        },
      }
      await routesRepository.addRoute(route)

      // Mock ADK response
      const adkResponse = [
        {
          content: {
            parts: [{ text: 'Hello from agent!' }],
            role: 'model',
          },
          invocationId: 'e-test-123',
          author: 'model',
          actions: {
            stateDelta: {},
            artifactDelta: {},
          },
        },
      ]

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => adkResponse,
      })

      // Simulate incoming message from Baileys
      const incomingMessage: IncomingMessage = {
        id: 'BAILEYS_MSG_001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello, agent!',
        timestamp: new Date(),
      }

      // Route message
      const result = await messageRouter.routeMessage(incomingMessage)

      // Verify agent was called with ADK format
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/run',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"app_name":"test_agent"'),
        })
      )

      // Verify result
      expect(result.success).toBe(true)
      expect(result.response).toBe('Hello from agent!')
    })

    it('should handle multiple messages in sequence', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000',
        config: {
          adk: {
            appName: 'test_agent',
            baseUrl: 'http://localhost:8000',
          },
        },
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      const adkResponse1 = [
        {
          content: { parts: [{ text: 'Response 1' }], role: 'model' },
          invocationId: 'e-test-1',
          author: 'model',
          actions: { stateDelta: {}, artifactDelta: {} },
        },
      ]
      const adkResponse2 = [
        {
          content: { parts: [{ text: 'Response 2' }], role: 'model' },
          invocationId: 'e-test-2',
          author: 'model',
          actions: { stateDelta: {}, artifactDelta: {} },
        },
      ]

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => adkResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => adkResponse2,
        })

      const message1: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Message 1',
        timestamp: new Date(),
      }

      const message2: IncomingMessage = {
        id: 'MSG002',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
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
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000',
        config: {
          adk: {
            appName: 'test_agent',
            baseUrl: 'http://localhost:8000',
          },
        },
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock ADK HTTP error (404 - agent not found)
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Agent not found',
      })

      const message: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Test message',
        timestamp: new Date(),
      }

      const result = await messageRouter.routeMessage(message)

      expect(result.success).toBe(false)
      expect(result.error).toContain('ADK agent endpoint returned 404')
    })

    it('should handle network errors', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000',
        config: {
          adk: {
            appName: 'test_agent',
            baseUrl: 'http://localhost:8000',
          },
        },
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const message: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
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
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
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
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000',
        config: {
          adk: {
            appName: 'test_agent',
            baseUrl: 'http://localhost:8000',
          },
        },
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock ADK response
      const adkResponse = [
        {
          content: {
            parts: [{ text: 'Agent response' }],
            role: 'model',
          },
          invocationId: 'e-test-123',
          author: 'model',
          actions: {
            stateDelta: {},
            artifactDelta: {},
          },
        },
      ]

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => adkResponse,
      })

      setupBaileysDirectRouting(messageRouter)

      // Simulate message from Baileys
      const message: IncomingMessage = {
        id: 'BAILEYS_MSG',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
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
        channelId: 'test-channel-111',
        agentEndpoint: 'http://localhost:8000',
        config: {
          adk: {
            appName: 'agent1',
            baseUrl: 'http://localhost:8000',
          },
        },
        environment: 'lab',
      }
      const route2: Route = {
        channelId: 'test-channel-222',
        agentEndpoint: 'http://localhost:8000',
        config: {
          adk: {
            appName: 'agent2',
            baseUrl: 'http://localhost:8000',
          },
        },
        environment: 'lab',
      }

      await routesRepository.addRoute(route1)
      await routesRepository.addRoute(route2)

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              content: { parts: [{ text: 'Agent 1 response' }], role: 'model' },
              invocationId: 'e-test-1',
              author: 'model',
              actions: { stateDelta: {}, artifactDelta: {} },
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              content: { parts: [{ text: 'Agent 2 response' }], role: 'model' },
              invocationId: 'e-test-2',
              author: 'model',
              actions: { stateDelta: {}, artifactDelta: {} },
            },
          ],
        })

      const message1: IncomingMessage = {
        id: 'MSG1',
        from: '5491111111111@s.whatsapp.net',
        channelId: 'test-channel-111',
        text: 'Message 1',
        timestamp: new Date(),
      }

      const message2: IncomingMessage = {
        id: 'MSG2',
        from: '5492222222222@s.whatsapp.net',
        channelId: 'test-channel-222',
        text: 'Message 2',
        timestamp: new Date(),
      }

      const result1 = await messageRouter.routeMessage(message1)
      const result2 = await messageRouter.routeMessage(message2)

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'http://localhost:8000/run',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"app_name":"agent1"'),
        })
      )
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'http://localhost:8000/run',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"app_name":"agent2"'),
        })
      )
      expect(result1.response).toBe('Agent 1 response')
      expect(result2.response).toBe('Agent 2 response')
    })
  })
})

