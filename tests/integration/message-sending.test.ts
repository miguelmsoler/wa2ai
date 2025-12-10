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
import { HttpAgentClient } from '../../router/src/infra/http-agent-client.js'
import type { IncomingMessage, Route, OutgoingMessage } from '../../router/src/core/models.js'
import type { WhatsAppProvider } from '../../router/src/core/whatsapp-provider.js'
import type { AgentResponse } from '../../router/src/core/agent-client.js'

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

    // Create agent client
    const agentClient = new HttpAgentClient()

    // Create message router with mocked provider
    messageRouter = new MessageRouter(
      routerService,
      agentClient,
      {
        whatsappProvider: mockWhatsAppProvider,
      }
    )

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
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent response
      const agentResponse: AgentResponse = {
        success: true,
        response: 'Hello from agent!',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => agentResponse,
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

      // Verify agent was called
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/agent',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
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
        agentEndpoint: 'http://localhost:8000/agent',
      })

      // Verify result
      expect(result.success).toBe(true)
      expect(result.response).toBe('Hello from agent!')
    })

    it('should not send message through provider if agent does not respond', async () => {
      // Setup route
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent response without response text
      const agentResponse: AgentResponse = {
        success: true,
        // No response field
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => agentResponse,
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
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent error response
      const agentResponse: AgentResponse = {
        success: false,
        error: 'Agent processing failed',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => agentResponse,
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
      expect(result.error).toContain('Agent processing failed')
    })

    it('should handle provider errors gracefully', async () => {
      // Setup route
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent response
      const agentResponse: AgentResponse = {
        success: true,
        response: 'Hello from agent!',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => agentResponse,
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
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent response
      const agentResponse: AgentResponse = {
        success: true,
        response: 'Response with metadata',
        metadata: {
          customField: 'customValue',
        },
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => agentResponse,
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
        agentEndpoint: 'http://localhost:8000/agent',
      })
    })

    it('should handle different channel ID formats', async () => {
      // Setup route
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          response: 'Response',
        }),
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
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }
      await routesRepository.addRoute(route)

      // Mock agent response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          response: 'Response from agent',
        }),
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
