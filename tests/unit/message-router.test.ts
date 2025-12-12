/**
 * Unit tests for message router.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageRouter } from '../../router/src/core/message-router.js'
import { RouterService } from '../../router/src/core/router-service.js'
import type { RoutesRepository } from '../../router/src/core/router-service.js'
import type { IncomingMessage, Route } from '../../router/src/core/models.js'
import type { AgentClient, AgentClientFactory } from '../../router/src/core/agent-client.js'
import type { WhatsAppProvider } from '../../router/src/core/whatsapp-provider.js'

// Mock fetch for ADK client
global.fetch = vi.fn()

describe('MessageRouter', () => {
  let mockRepository: RoutesRepository
  let routerService: RouterService
  let messageRouter: MessageRouter
  let mockAgentClient: AgentClient
  let mockAgentClientFactory: AgentClientFactory
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
    
    // Create a mock agent client factory
    mockAgentClientFactory = {
      createAdkClient: vi.fn().mockReturnValue(mockAgentClient),
    } as AgentClientFactory
    
    // Create a mock WhatsApp provider
    mockWhatsAppProvider = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      normalizeWebhook: vi.fn().mockReturnValue(null),
    }
    
    // Create message router with mocked dependencies
    messageRouter = new MessageRouter(routerService, {
      whatsappProvider: mockWhatsAppProvider,
      agentClientFactory: mockAgentClientFactory,
    })
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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Agent response',
      })

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBe('Agent response')
      expect(mockAgentClientFactory.createAdkClient).toHaveBeenCalled()
      expect(mockAgentClient.sendMessage).toHaveBeenCalledWith(
        'http://localhost:8000',
        mockMessage
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
      vi.mocked(mockAgentClient.sendMessage).mockRejectedValueOnce(new Error('Network error'))

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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Response',
      })

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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Agent response text',
      })

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

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Agent response text',
      })

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
      vi.mocked(mockAgentClient.sendMessage).mockRejectedValueOnce(timeoutError)

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to communicate with agent')
    })

    it('should handle agent response with success=false', async () => {
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
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Agent processing failed',
      })

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Agent processing failed')
    })

    it('should handle agent response with success=false and no error message', async () => {
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
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: false,
      })

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Agent processing failed')
    })

    it('should not send message via provider when agent response has no text', async () => {
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
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        // No response text
      })

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
      expect(mockWhatsAppProvider.sendMessage).not.toHaveBeenCalled()
    })

    it('should handle provider sendMessage failure gracefully', async () => {
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
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Agent response text',
      })
      vi.mocked(mockWhatsAppProvider.sendMessage).mockRejectedValueOnce(
        new Error('WhatsApp connection failed')
      )

      const result = await messageRouter.routeMessage(mockMessage)

      // Should still return success even if sending response fails
      expect(result.success).toBe(true)
      expect(result.response).toBe('Agent response text')
      expect(mockWhatsAppProvider.sendMessage).toHaveBeenCalled()
    })

    it('should use baseUrl from adkConfig when provided', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        config: {
          adk: {
            appName: 'test_agent',
            baseUrl: 'http://custom-base-url:9000',
          },
        },
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Response',
      })

      await messageRouter.routeMessage(mockMessage)

      expect(mockAgentClientFactory.createAdkClient).toHaveBeenCalledWith({
        appName: 'test_agent',
        baseUrl: 'http://custom-base-url:9000',
        timeout: 30000,
      })
      expect(mockAgentClient.sendMessage).toHaveBeenCalledWith(
        'http://custom-base-url:9000',
        mockMessage
      )
    })

    it('should use agentEndpoint when baseUrl is not in adkConfig', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://fallback-endpoint:8000',
        environment: 'lab',
        config: {
          adk: {
            appName: 'test_agent',
            // No baseUrl
          },
        },
      }

      vi.mocked(mockRepository.findByChannelId).mockResolvedValue(route)
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Response',
      })

      await messageRouter.routeMessage(mockMessage)

      expect(mockAgentClientFactory.createAdkClient).toHaveBeenCalledWith({
        appName: 'test_agent',
        baseUrl: 'http://fallback-endpoint:8000',
        timeout: 30000,
      })
      expect(mockAgentClient.sendMessage).toHaveBeenCalledWith(
        'http://fallback-endpoint:8000',
        mockMessage
      )
    })

    it('should include agent response metadata in result', async () => {
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
      vi.mocked(mockAgentClient.sendMessage).mockResolvedValueOnce({
        success: true,
        response: 'Response',
        metadata: {
          adk: {
            sessionId: 'test-session',
            invocationId: 'test-invocation',
          },
        },
      })

      const result = await messageRouter.routeMessage(mockMessage)

      expect(result.success).toBe(true)
      expect(result.metadata).toMatchObject({
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
        adk: {
          sessionId: 'test-session',
          invocationId: 'test-invocation',
        },
      })
    })
  })
})

