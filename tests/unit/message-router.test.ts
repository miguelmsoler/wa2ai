/**
 * Unit tests for message router.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageRouter } from '../../router/src/core/message-router.js'
import { RouterService } from '../../router/src/core/router-service.js'
import type { RoutesRepository } from '../../router/src/core/router-service.js'
import type { IncomingMessage, Route } from '../../router/src/core/models.js'
import type { AgentClient } from '../../router/src/core/agent-client.js'
import type { WhatsAppProvider } from '../../router/src/core/whatsapp-provider.js'

// Mock fetch for ADK client
global.fetch = vi.fn()

describe('MessageRouter', () => {
  let mockRepository: RoutesRepository
  let routerService: RouterService
  let messageRouter: MessageRouter
  let mockAgentClient: AgentClient
  let mockWhatsAppProvider: WhatsAppProvider

  const mockMessage: IncomingMessage = {
    id: 'MSG001',
    from: 'test-user-123@s.whatsapp.net',
    channelId: 'test-channel-123',
    text: 'Hello',
    timestamp: new Date(),
  }

  beforeEach(() => {
    mockRepository = {
      findByChannelId: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
    }

    routerService = new RouterService(mockRepository)
    
    // Create a mock agent client
    const sendMessageMock = vi.fn()
    mockAgentClient = {
      sendMessage: sendMessageMock,
    } as AgentClient
    
    // Create a mock WhatsApp provider
    mockWhatsAppProvider = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      normalizeWebhook: vi.fn().mockReturnValue(null),
    }
    
    // Create message router with mocked dependencies
    messageRouter = new MessageRouter(
      routerService,
      mockAgentClient,
      {
        whatsappProvider: mockWhatsAppProvider,
      }
    )
  })

  describe('routeMessage', () => {
    it('should return error when no route is found', async () => {
      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(null)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No route found')
      expect(mockAgentClient.sendMessage).not.toHaveBeenCalled()
    })

    it('should send message to agent when route is found', async () => {
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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => adkResponse,
      } as Response)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBe('Agent response')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/run',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"app_name":"test_agent"'),
        })
      )
    })

    it('should return error when route missing ADK config', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        // Missing ADK config
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Route missing required agent configuration')
    })

    it('should handle agent client errors', async () => {
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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to communicate with agent')
    })

    it('should include route metadata in successful response', async () => {
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

      // Mock ADK response with metadata
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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => adkResponse,
      } as Response)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.metadata).toMatchObject({
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
      })
    })

    it('should send response via WhatsApp provider when agent returns response', async () => {
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

      // Mock ADK response
      const adkResponse = [
        {
          content: {
            parts: [{ text: 'Agent response text' }],
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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => adkResponse,
      } as Response)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(true)
      expect(mockWhatsAppProvider.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockMessage.from,
          channelId: mockMessage.channelId,
          text: 'Agent response text',
        })
      )
    })

    it('should always send response via configured provider', async () => {
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

      // Mock ADK response
      const adkResponse = [
        {
          content: {
            parts: [{ text: 'Agent response text' }],
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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => adkResponse,
      } as Response)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(true)
      expect(mockWhatsAppProvider.sendMessage).toHaveBeenCalledTimes(1)
      expect(mockWhatsAppProvider.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockMessage.from,
          channelId: mockMessage.channelId,
          text: 'Agent response text',
        })
      )
    })

    it('should handle timeout errors from agent client', async () => {
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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      const timeoutError = new Error('ADK request timed out after 30000ms')
      timeoutError.name = 'AbortError'
      vi.mocked(global.fetch).mockRejectedValueOnce(timeoutError)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to communicate with agent')
    })
  })
})

