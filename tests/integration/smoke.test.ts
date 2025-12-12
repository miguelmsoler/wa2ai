/**
 * Smoke tests for wa2ai router.
 * 
 * These tests verify that the application can start correctly and
 * that basic endpoints respond as expected. Smoke tests are minimal
 * tests that ensure the system is functional at a basic level.
 * 
 * @module tests/integration/smoke
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fastify, { type FastifyInstance } from 'fastify'
import { registerWebhooks } from '../../router/src/webhooks-controller.js'
import { registerRouteEndpoints } from '../../router/src/routes-controller.js'
import { PostgresRoutesRepository } from '../../router/src/infra/postgres-routes-repository.js'
import { RouterService } from '../../router/src/core/router-service.js'
import { MessageRouter } from '../../router/src/core/message-router.js'
import { HttpAgentClientFactory } from '../../router/src/infra/agent-client-factory.js'
import type { WhatsAppProvider } from '../../router/src/core/whatsapp-provider.js'

// Mock pg module to avoid requiring real database
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
}

const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  end: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
}

vi.mock('pg', () => {
  return {
    Pool: vi.fn(() => mockPool),
  }
})

// Mock Baileys to avoid requiring real WhatsApp connection
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
  getContentType: vi.fn(() => 'conversation'),
}))

// Mock fetch for agent client
global.fetch = vi.fn()

describe('wa2ai Smoke Tests', () => {
  let app: FastifyInstance
  let mockProvider: WhatsAppProvider
  let routesRepository: PostgresRoutesRepository
  let messageRouter: MessageRouter

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    mockClient.query.mockReset()
    mockClient.release.mockReset()
    mockPool.connect.mockResolvedValue(mockClient)

    // Setup default mock responses for findAll (used by GET /api/routes)
    mockClient.query.mockResolvedValue({
      rows: [],
      rowCount: 0,
    })

    // Create Fastify instance
    app = fastify({
      logger: false, // Disable logging in tests
    })

    // Create mock WhatsApp provider
    mockProvider = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      normalizeWebhook: vi.fn().mockReturnValue(null),
    }

    // Create routes repository
    routesRepository = new PostgresRoutesRepository()

    // Create router service
    const routerService = new RouterService(routesRepository)

    // Create agent client factory
    const agentClientFactory = new HttpAgentClientFactory()

    // Create message router
    messageRouter = new MessageRouter(routerService, {
      whatsappProvider: mockProvider,
      agentClientFactory,
    })

    // Register endpoints
    registerWebhooks(app, {
      messageRouter,
      whatsappProvider: mockProvider,
    })

    registerRouteEndpoints(app, routesRepository)

    // Start server
    await app.ready()
  })

  afterEach(async () => {
    // Close server
    await app.close()
  })

  describe('Server startup', () => {
    it('should start server successfully', async () => {
      expect(app).toBeDefined()
      expect(app.server).toBeDefined()
    })

    it('should have registered health endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual({ status: 'healthy' })
    })
  })

  describe('Basic endpoints', () => {
    it('should respond to GET /health', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('status')
      expect(body.status).toBe('healthy')
    })

    it('should respond to GET /api/routes', async () => {
      // Setup mock for findAll
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/routes',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('data')
      expect(body).toHaveProperty('count')
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
      expect(typeof body.count).toBe('number')
    })

    it('should respond to POST /api/routes with valid data', async () => {
      // Setup mock for addRoute
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 }) // COUNT

      const routeData = {
        channelId: 'test-channel-smoke',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/routes',
        payload: routeData,
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
      expect(body.success).toBe(true)
      expect(body).toHaveProperty('data')
      expect(body.data.channelId).toBe(routeData.channelId)
    })

    it('should respond to GET /api/routes/:channelId', async () => {
      // Setup mock for findByChannelId - must be called before the request
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          channel_id: 'test-channel-get',
          agent_endpoint: 'http://localhost:8000/agent',
          environment: 'lab',
          regex_filter: null,
          config: null,
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/routes/test-channel-get',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
      expect(body.success).toBe(true)
      expect(body).toHaveProperty('data')
      expect(body.data.channelId).toBe('test-channel-get')
    })

    it('should return 404 for non-existent route', async () => {
      // Setup mock for findByChannelId returning empty result
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/routes/non-existent-channel',
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
      expect(body.success).toBe(false)
      expect(body).toHaveProperty('error')
    })
  })

  describe('Error handling', () => {
    it('should return 400 for invalid regex pattern', async () => {
      // No need to mock database for validation error (happens before DB call)
      const routeData = {
        channelId: 'test-channel-invalid-regex',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
        regexFilter: '[invalid', // Invalid regex pattern
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/routes',
        payload: routeData,
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('success')
      expect(body.success).toBe(false)
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('code')
      expect(body.code).toBe('INVALID_REGEX_PATTERN')
      expect(body).toHaveProperty('details')
    })

    it('should return 404 for unsupported HTTP method on webhook endpoint', async () => {
      // Fastify returns 404 for routes that don't exist or methods not registered
      const response = await app.inject({
        method: 'GET',
        url: '/webhooks/whatsapp/lab',
      })

      // Webhook endpoint only accepts POST, so GET returns 404
      expect(response.statusCode).toBe(404)
    })
  })

  describe('System integration', () => {
    it('should have routes repository initialized', () => {
      expect(routesRepository).toBeDefined()
      expect(routesRepository).toBeInstanceOf(PostgresRoutesRepository)
    })

    it('should have message router initialized', () => {
      expect(messageRouter).toBeDefined()
      expect(messageRouter).toBeInstanceOf(MessageRouter)
    })

    it('should have WhatsApp provider configured', () => {
      expect(mockProvider).toBeDefined()
      expect(mockProvider).toHaveProperty('sendMessage')
      expect(mockProvider).toHaveProperty('normalizeWebhook')
    })
  })
})
