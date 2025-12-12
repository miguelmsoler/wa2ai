/**
 * Integration tests for message sending flow.
 * 
 * Tests the complete flow: wa2ai → Provider → WhatsApp
 * 
 * This test verifies that when MessageRouter processes a message and receives
 * a response from an agent, it correctly sends the response back through the
 * configured WhatsApp provider.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InMemoryRoutesRepository } from '../../router/src/core/routes-repository.js'
import { RouterService } from '../../router/src/core/router-service.js'
import { MessageRouter } from '../../router/src/core/message-router.js'
import { HttpAgentClientFactory } from '../../router/src/infra/agent-client-factory.js'
import type { IncomingMessage, Route, OutgoingMessage } from '../../router/src/core/models.js'
import type { WhatsAppProvider } from '../../router/src/core/whatsapp-provider.js'

// Mock fetch for agent client
global.fetch = vi.fn()

describe('Message Sending Flow (wa2ai → Provider → WhatsApp)', () => {
  let routesRepository: InMemoryRoutesRepository
  let routerService: RouterService
  let messageRouter: MessageRouter
  let mockWhatsAppProvider: WhatsAppProvider
  let fetchMock: ReturnType<typeof vi.fn>
  let sendMessageSpy: ReturnType<typeof vi.fn<[OutgoingMessage], Promise<void>>>

  beforeEach(() => {
    routesRepository = new InMemoryRoutesRepository()
    routerService = new RouterService(routesRepository)

    // Create mock WhatsApp provider
    sendMessageSpy = vi.fn<[OutgoingMessage], Promise<void>>().mockResolvedValue(undefined)
    mockWhatsAppProvider = {
      sendMessage: sendMessageSpy,
      normalizeWebhook: vi.fn().mockReturnValue(null),
    }

    // Create agent client factory
    const agentClientFactory = new HttpAgentClientFactory()

    // Create message router with mocked provider
    messageRouter = new MessageRouter(routerService, {
      whatsappProvider: mockWhatsAppProvider,
      agentClientFactory,
    })

    fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockClear()
    sendMessageSpy.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete message sending flow', () => {
    it('should send message through provider when agent responds', async () => {
      // Setup route
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

      // Simulate incoming message
      const incomingMessage: IncomingMessage = {
        id: 'MSG_001',
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
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"app_name":"test_agent"'),
        })
      )

      // Verify provider.sendMessage was called with correct parameters
      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
      const sentMessage = sendMessageSpy.mock.calls[0][0] as OutgoingMessage

      expect(sentMessage).toMatchObject({
        to: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello from agent!',
      })

      expect(sentMessage.metadata).toMatchObject({
        originalMessageId: 'MSG_001',
        agentEndpoint: 'http://localhost:8000',
      })

      // Verify result
      expect(result.success).toBe(true)
      expect(result.response).toBe('Hello from agent!')
    })

    it('should not send message through provider if agent does not respond', async () => {
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

      // Mock ADK response with no model events (empty array or only user events)
      const adkResponse: any[] = []

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => adkResponse,
      })

      // Simulate incoming message
      const incomingMessage: IncomingMessage = {
        id: 'MSG_002',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello, agent!',
        timestamp: new Date(),
      }

      // Route message
      const result = await messageRouter.routeMessage(incomingMessage)

      // Verify agent was called
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Verify provider.sendMessage was NOT called (no response from agent)
      expect(sendMessageSpy).not.toHaveBeenCalled()

      // Verify result
      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it('should not send message through provider if agent fails', async () => {
      // Setup route
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

      // Simulate incoming message
      const incomingMessage: IncomingMessage = {
        id: 'MSG_003',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello, agent!',
        timestamp: new Date(),
      }

      // Route message
      const result = await messageRouter.routeMessage(incomingMessage)

      // Verify agent was called
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Verify provider.sendMessage was NOT called (agent failed)
      expect(sendMessageSpy).not.toHaveBeenCalled()

      // Verify result
      expect(result.success).toBe(false)
      expect(result.error).toContain('ADK agent endpoint returned 404')
    })

    it('should handle provider errors gracefully', async () => {
      // Setup route
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

      // Mock provider to throw error
      const providerError = new Error('WhatsApp connection failed')
      sendMessageSpy.mockRejectedValueOnce(providerError)

      // Simulate incoming message
      const incomingMessage: IncomingMessage = {
        id: 'MSG_004',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello, agent!',
        timestamp: new Date(),
      }

      // Route message (should not throw, but log error)
      const result = await messageRouter.routeMessage(incomingMessage)

      // Verify agent was called
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Verify provider.sendMessage was called (but failed)
      expect(sendMessageSpy).toHaveBeenCalledTimes(1)

      // Verify result is still successful (provider errors are logged but don't fail the flow)
      expect(result.success).toBe(true)
      expect(result.response).toBe('Hello from agent!')
    })

    it('should send message with correct metadata', async () => {
      // Setup route
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
            parts: [{ text: 'Response with metadata' }],
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

      // Simulate incoming message
      const incomingMessage: IncomingMessage = {
        id: 'MSG_005',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Test message',
        timestamp: new Date(),
        metadata: {
          source: 'whatsapp',
        },
      }

      // Route message
      await messageRouter.routeMessage(incomingMessage)

      // Verify provider.sendMessage was called with correct metadata
      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
      const sentMessage = sendMessageSpy.mock.calls[0][0] as OutgoingMessage

      expect(sentMessage.metadata).toMatchObject({
        originalMessageId: 'MSG_005',
        agentEndpoint: 'http://localhost:8000',
      })
    })

    it('should handle different channel ID formats', async () => {
      // Setup route
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
            parts: [{ text: 'Response' }],
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

      // Test with JID format in 'from' field
      const incomingMessage: IncomingMessage = {
        id: 'MSG_006',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Test',
        timestamp: new Date(),
      }

      await messageRouter.routeMessage(incomingMessage)

      // Verify provider received correct 'to' field (should match 'from' field)
      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
      const sentMessage = sendMessageSpy.mock.calls[0][0] as OutgoingMessage
      expect(sentMessage.to).toBe('test-user-123@s.whatsapp.net')
      expect(sentMessage.channelId).toBe('test-channel-123')
    })

    it('should always send response via configured provider', async () => {
      // Setup route
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
            parts: [{ text: 'Response from agent' }],
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

      // Simulate incoming message
      const incomingMessage: IncomingMessage = {
        id: 'MSG_007',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Test',
        timestamp: new Date(),
      }

      // Route message
      const result = await messageRouter.routeMessage(incomingMessage)

      // Verify result is successful
      expect(result.success).toBe(true)
      expect(result.response).toBe('Response from agent')

      // Verify provider was called to send response
      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
      expect(sendMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test-user-123@s.whatsapp.net',
          channelId: 'test-channel-123',
          text: 'Response from agent',
        })
      )
    })
  })
})
