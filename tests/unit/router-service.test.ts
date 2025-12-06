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
  })
})

