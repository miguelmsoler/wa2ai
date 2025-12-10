import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { registerRouteEndpoints } from '../../router/src/routes-controller.js'
import { InMemoryRoutesRepository } from '../../router/src/core/routes-repository.js'

describe('RoutesController', () => {
  let mockApp: FastifyInstance
  let mockRequest: FastifyRequest
  let mockReply: FastifyReply
  let mockRoutesRepository: InMemoryRoutesRepository
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>

    // Mock FastifyReply
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply

    // Mock FastifyRequest
    mockRequest = {
      body: {},
      params: {},
      headers: {},
    } as unknown as FastifyRequest

    // Create fresh repository for each test
    mockRoutesRepository = new InMemoryRoutesRepository()

    // Mock FastifyInstance
    mockApp = {
      post: vi.fn((route: string, handler: any) => {
        if (route === '/api/routes') {
          ;(mockApp as any).postRouteHandler = handler
        }
      }),
      get: vi.fn((route: string, handler: any) => {
        if (route === '/api/routes') {
          ;(mockApp as any).getRoutesHandler = handler
        } else if (route === '/api/routes/:channelId') {
          ;(mockApp as any).getRouteHandler = handler
        }
      }),
      put: vi.fn((route: string, handler: any) => {
        if (route === '/api/routes/:channelId') {
          ;(mockApp as any).putRouteHandler = handler
        }
      }),
      delete: vi.fn((route: string, handler: any) => {
        if (route === '/api/routes/:channelId') {
          ;(mockApp as any).deleteRouteHandler = handler
        }
      }),
    } as unknown as FastifyInstance

    // Register route endpoints
    registerRouteEndpoints(mockApp, mockRoutesRepository)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('POST /api/routes', () => {
    it('should add a new route', async () => {
      const routeBody = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
      }

      mockRequest.body = routeBody

      const handler = (mockApp as any).postRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(201)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Route added successfully',
          data: routeBody,
        })
      )

      // Verify route was actually added
      const route = await mockRoutesRepository.findByChannelId('5491155551234')
      expect(route).toEqual(routeBody)
    })

    it('should handle route with config', async () => {
      const routeBody = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
        config: { timeout: 5000 },
      }

      mockRequest.body = routeBody

      const handler = (mockApp as any).postRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(201)
      const route = await mockRoutesRepository.findByChannelId('5491155551234')
      expect(route?.config).toEqual({ timeout: 5000 })
    })
  })

  describe('GET /api/routes', () => {
    it('should return empty array when no routes exist', async () => {
      const handler = (mockApp as any).getRoutesHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
          count: 0,
        })
      )
    })

    it('should return all routes', async () => {
      await mockRoutesRepository.addRoute({
        channelId: '5491111111111',
        agentEndpoint: 'http://localhost:8000/agent1',
        environment: 'lab',
      })
      await mockRoutesRepository.addRoute({
        channelId: '5492222222222',
        agentEndpoint: 'http://localhost:8000/agent2',
        environment: 'lab',
      })

      const handler = (mockApp as any).getRoutesHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(200)
      const response = (mockReply.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(response.success).toBe(true)
      expect(response.data).toHaveLength(2)
      expect(response.count).toBe(2)
    })
  })

  describe('GET /api/routes/:channelId', () => {
    it('should return route when found', async () => {
      const route = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
      }
      await mockRoutesRepository.addRoute(route)

      mockRequest.params = { channelId: '5491155551234' }

      const handler = (mockApp as any).getRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: route,
        })
      )
    })

    it('should return 404 when route not found', async () => {
      mockRequest.params = { channelId: 'non-existent' }

      const handler = (mockApp as any).getRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Route not found'),
        })
      )
    })
  })

  describe('PUT /api/routes/:channelId', () => {
    it('should update existing route', async () => {
      const existingRoute = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
      }
      await mockRoutesRepository.addRoute(existingRoute)

      const updatedRoute = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:9000/agent',
        environment: 'prod' as const,
      }

      mockRequest.params = { channelId: '5491155551234' }
      mockRequest.body = updatedRoute

      const handler = (mockApp as any).putRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(200)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Route updated successfully',
          data: updatedRoute,
        })
      )

      // Verify route was actually updated
      const route = await mockRoutesRepository.findByChannelId('5491155551234')
      expect(route?.agentEndpoint).toBe('http://localhost:9000/agent')
      expect(route?.environment).toBe('prod')
    })

    it('should create route if not exists (upsert)', async () => {
      const newRoute = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
      }

      mockRequest.params = { channelId: '5491155551234' }
      mockRequest.body = newRoute

      const handler = (mockApp as any).putRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(201)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Route created successfully',
          data: newRoute,
        })
      )
    })

    it('should change channelId when provided in body', async () => {
      const existingRoute = {
        channelId: 'old-channel',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
      }
      await mockRoutesRepository.addRoute(existingRoute)

      const updatedRoute = {
        channelId: 'new-channel',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
      }

      mockRequest.params = { channelId: 'old-channel' }
      mockRequest.body = updatedRoute

      const handler = (mockApp as any).putRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(200)
      
      // Verify old route is gone and new one exists
      const oldRoute = await mockRoutesRepository.findByChannelId('old-channel')
      const newRoute = await mockRoutesRepository.findByChannelId('new-channel')
      expect(oldRoute).toBeNull()
      expect(newRoute).toEqual(updatedRoute)
    })
  })

  describe('DELETE /api/routes/:channelId', () => {
    it('should remove route when found', async () => {
      const route = {
        channelId: '5491155551234',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab' as const,
      }
      await mockRoutesRepository.addRoute(route)

      mockRequest.params = { channelId: '5491155551234' }

      const handler = (mockApp as any).deleteRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(204)
      expect(mockReply.send).toHaveBeenCalledWith()

      // Verify route was actually removed
      const found = await mockRoutesRepository.findByChannelId('5491155551234')
      expect(found).toBeNull()
    })

    it('should return 404 when route not found', async () => {
      mockRequest.params = { channelId: 'non-existent' }

      const handler = (mockApp as any).deleteRouteHandler
      await handler(mockRequest, mockReply)

      expect(mockReply.code).toHaveBeenCalledWith(404)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Route not found'),
        })
      )
    })
  })
})
