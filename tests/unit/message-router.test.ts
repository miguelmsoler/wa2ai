/**
 * Unit tests for message router.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageRouter } from '../../router/src/core/message-router.js'
import { RouterService } from '../../router/src/core/router-service.js'
import type { RoutesRepository } from '../../router/src/core/router-service.js'
import type { IncomingMessage, Route } from '../../router/src/core/models.js'
import type { AgentResponse, AgentClient } from '../../router/src/core/agent-client.js'
import type { WhatsAppProvider } from '../../router/src/core/whatsapp-provider.js'

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
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      const agentResponse: AgentResponse = {
        success: true,
        response: 'Agent response',
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValue(agentResponse)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBe('Agent response')
      expect(mockAgentClient.sendMessage).toHaveBeenCalledWith(
        route.agentEndpoint,
        mockMessage
      )
    })

    it('should return error when agent returns failure', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      const agentResponse: AgentResponse = {
        success: false,
        error: 'Agent processing failed',
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValue(agentResponse)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Agent processing failed')
    })

    it('should handle agent client errors', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockRejectedValue(new Error('Network error'))

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to communicate with agent')
    })

    it('should include route metadata in successful response', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
        config: { timeout: 5000 },
      }

      const agentResponse: AgentResponse = {
        success: true,
        response: 'Response',
        metadata: { processed: true },
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValue(agentResponse)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.metadata).toMatchObject({
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
        processed: true,
      })
    })

    it('should send response via WhatsApp provider when agent returns response', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      const agentResponse: AgentResponse = {
        success: true,
        response: 'Agent response text',
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValue(agentResponse)

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
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      const agentResponse: AgentResponse = {
        success: true,
        response: 'Agent response text',
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValue(agentResponse)

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
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockRejectedValue(
        new Error('Request to agent timed out after 30000ms')
      )

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to communicate with agent')
    })
  })
})

