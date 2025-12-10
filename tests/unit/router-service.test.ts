import { describe, it, expect, vi } from 'vitest'
import { RouterService } from '../../router/src/core/router-service.js'
import type { RoutesRepository } from '../../router/src/core/router-service.js'
import type { IncomingMessage, Route } from '../../router/src/core/models.js'

describe('RouterService', () => {
  describe('routeMessage', () => {
    it('should return route when channel exists', async () => {
      const mockRoute: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn().mockResolvedValue(mockRoute),
        findAll: vi.fn().mockResolvedValue([mockRoute]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'channel-1',
        text: 'Hello',
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      expect(result).toEqual(mockRoute)
      expect(mockRepository.findByChannelId).toHaveBeenCalledWith('channel-1')
    })

    it('should return null when channel does not exist', async () => {
      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn().mockResolvedValue(null),
        findAll: vi.fn().mockResolvedValue([]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'non-existent',
        text: 'Hello',
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      expect(result).toBeNull()
      expect(mockRepository.findByChannelId).toHaveBeenCalledWith('non-existent')
    })

    it('should return route when regex filter matches message text', async () => {
      const mockRoute: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        regexFilter: '^Hello',
      }

      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn().mockResolvedValue(mockRoute),
        findAll: vi.fn().mockResolvedValue([mockRoute]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'channel-1',
        text: 'Hello world',
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      expect(result).toEqual(mockRoute)
    })

    it('should return null when regex filter does not match message text', async () => {
      const mockRoute: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        regexFilter: '^Hello',
      }

      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn().mockResolvedValue(mockRoute),
        findAll: vi.fn().mockResolvedValue([mockRoute]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'channel-1',
        text: 'Hi there',
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      expect(result).toBeNull()
    })

    it('should return route without regex filter even if text does not match', async () => {
      const mockRoute: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        // No regexFilter
      }

      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn().mockResolvedValue(mockRoute),
        findAll: vi.fn().mockResolvedValue([mockRoute]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'channel-1',
        text: 'Any text',
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      expect(result).toEqual(mockRoute)
    })

    it('should return null when wildcard route regex filter does not match', async () => {
      const mockWildcardRoute: Route = {
        channelId: '*',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        regexFilter: '^Test',
      }

      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn()
          .mockResolvedValueOnce(null) // No specific route
          .mockResolvedValueOnce(mockWildcardRoute), // Wildcard route
        findAll: vi.fn().mockResolvedValue([mockWildcardRoute]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'some-channel',
        text: 'Hello world', // Does not match ^Test
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      expect(result).toBeNull()
      expect(mockRepository.findByChannelId).toHaveBeenCalledWith('some-channel')
      expect(mockRepository.findByChannelId).toHaveBeenCalledWith('*')
    })

    it('should return wildcard route when regex filter matches', async () => {
      const mockWildcardRoute: Route = {
        channelId: '*',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        regexFilter: '^Test',
      }

      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn()
          .mockResolvedValueOnce(null) // No specific route
          .mockResolvedValueOnce(mockWildcardRoute), // Wildcard route
        findAll: vi.fn().mockResolvedValue([mockWildcardRoute]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'some-channel',
        text: 'Test message', // Matches ^Test
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      expect(result).toEqual(mockWildcardRoute)
    })

    it('should return null when regex filter is invalid', async () => {
      const mockRoute: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        regexFilter: '[invalid regex', // Invalid regex pattern
      }

      const mockRepository: RoutesRepository = {
        findByChannelId: vi.fn().mockResolvedValue(mockRoute),
        findAll: vi.fn().mockResolvedValue([mockRoute]),
      }

      const routerService = new RouterService(mockRepository)

      const message: IncomingMessage = {
        id: 'msg-1',
        from: '1234567890',
        channelId: 'channel-1',
        text: 'Any text',
        timestamp: new Date(),
      }

      const result = await routerService.routeMessage(message)

      // Invalid regex should be treated as non-matching
      expect(result).toBeNull()
    })
  })
})

