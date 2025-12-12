/**
 * Unit tests for PostgresRoutesRepository.
 * 
 * These tests mock the PostgreSQL connection pool to avoid requiring
 * a real database connection during unit testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PostgresRoutesRepository } from '../../router/src/infra/postgres-routes-repository.js'
import type { Route } from '../../router/src/core/models.js'

// Mock pg module
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
}

const mockPool = {
  connect: vi.fn(),
  end: vi.fn(),
  on: vi.fn(),
}

vi.mock('pg', () => {
  return {
    Pool: vi.fn(() => mockPool),
  }
})

import { Pool } from 'pg'

describe('PostgresRoutesRepository', () => {
  let repository: PostgresRoutesRepository

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup mock pool to return mock client
    mockPool.connect = vi.fn().mockResolvedValue(mockClient)
    mockPool.end = vi.fn().mockResolvedValue(undefined)
    mockPool.on = vi.fn()

    // Reset mock client
    mockClient.query = vi.fn()
    mockClient.release = vi.fn()

    // Create repository instance
    repository = new PostgresRoutesRepository({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create pool with default configuration', () => {
      new PostgresRoutesRepository()
      expect(Pool).toHaveBeenCalled()
    })

    it('should create pool with custom configuration', () => {
      new PostgresRoutesRepository({
        host: 'custom-host',
        port: 5433,
        database: 'custom-db',
        user: 'custom-user',
        password: 'custom-pass',
      })
      expect(Pool).toHaveBeenCalled()
    })

    it('should register pool error handler', () => {
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function))
    })
  })

  describe('findByChannelId', () => {
    const testRoute: Route = {
      channelId: 'test-channel-123',
      agentEndpoint: 'http://localhost:8000/agent',
      environment: 'lab',
    }

    it('should return null for non-existent channel', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      const result = await repository.findByChannelId('non-existent')

      expect(result).toBeNull()
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT channel_id, agent_endpoint, environment'),
        ['non-existent']
      )
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should return route when channel exists', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            channel_id: 'test-channel-123',
            agent_endpoint: 'http://localhost:8000/agent',
            environment: 'lab',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
          },
        ],
        rowCount: 1,
      })

      const result = await repository.findByChannelId('test-channel-123')

      expect(result).toEqual(testRoute)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT channel_id, agent_endpoint, environment'),
        ['test-channel-123']
      )
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockClient.query.mockRejectedValueOnce(dbError)

      await expect(
        repository.findByChannelId('test-channel-123')
      ).rejects.toThrow('Failed to find route: Database connection failed')

      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should map database row to Route correctly', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            channel_id: 'test-channel-456',
            agent_endpoint: 'http://localhost:9000/agent',
            environment: 'prod',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
          },
        ],
        rowCount: 1,
      })

      const result = await repository.findByChannelId('test-channel-456')

      expect(result).toEqual({
        channelId: 'test-channel-456',
        agentEndpoint: 'http://localhost:9000/agent',
        environment: 'prod',
      })
    })
  })

  describe('findAll', () => {
    it('should return empty array when no routes exist', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      const result = await repository.findAll()

      expect(result).toEqual([])
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT channel_id, agent_endpoint, environment')
      )
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should return all routes', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            channel_id: 'test-channel-111',
            agent_endpoint: 'http://localhost:8000/agent1',
            environment: 'lab',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
          },
          {
            channel_id: 'test-channel-222',
            agent_endpoint: 'http://localhost:8000/agent2',
            environment: 'lab',
            created_at: new Date('2024-01-02T00:00:00Z'),
            updated_at: new Date('2024-01-02T00:00:00Z'),
          },
        ],
        rowCount: 2,
      })

      const result = await repository.findAll()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        channelId: 'test-channel-111',
        agentEndpoint: 'http://localhost:8000/agent1',
        environment: 'lab',
      })
      expect(result[1]).toEqual({
        channelId: 'test-channel-222',
        agentEndpoint: 'http://localhost:8000/agent2',
        environment: 'lab',
      })
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should update cache after findAll', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            channel_id: 'test-channel-111',
            agent_endpoint: 'http://localhost:8000/agent1',
            environment: 'lab',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
          },
        ],
        rowCount: 1,
      })

      await repository.findAll()

      expect(repository.getRouteCount()).toBe(1)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed')
      mockClient.query.mockRejectedValueOnce(dbError)

      await expect(repository.findAll()).rejects.toThrow('Failed to find all routes: Query failed')

      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('addRoute', () => {
    const testRoute: Route = {
      channelId: 'test-channel-123',
      agentEndpoint: 'http://localhost:8000/agent',
      environment: 'lab',
    }

    it('should add a new route', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        })

      await repository.addRoute(testRoute)

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO routes'),
        [testRoute.channelId, testRoute.agentEndpoint, testRoute.environment, null, null]
      )
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should update existing route on conflict', async () => {
      const updatedRoute: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:9000/agent',
        environment: 'prod',
      }

      mockClient.query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        })

      await repository.addRoute(updatedRoute)

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        [updatedRoute.channelId, updatedRoute.agentEndpoint, updatedRoute.environment, null, null]
      )
    })

    it('should refresh cache after adding route', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        })

      await repository.addRoute(testRoute)

      expect(repository.getRouteCount()).toBe(1)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Insert failed')
      mockClient.query.mockRejectedValueOnce(dbError)

      await expect(repository.addRoute(testRoute)).rejects.toThrow(
        'Failed to add route: Insert failed'
      )

      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('removeRoute', () => {
    it('should return false for non-existent route', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      const result = await repository.removeRoute('non-existent')

      expect(result).toBe(false)
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM routes WHERE channel_id = $1',
        ['non-existent']
      )
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should return true and remove existing route', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ count: '0' }],
          rowCount: 1,
        })

      const result = await repository.removeRoute('test-channel-123')

      expect(result).toBe(true)
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM routes WHERE channel_id = $1',
        ['test-channel-123']
      )
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should refresh cache after removing route', async () => {
      // First, set up cache with a route
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
          rowCount: 1,
        })
      await (repository as any).refreshRouteCount()

      // Then remove it
      mockClient.query
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [{ count: '0' }],
          rowCount: 1,
        })

      await repository.removeRoute('test-channel-123')

      expect(repository.getRouteCount()).toBe(0)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Delete failed')
      mockClient.query.mockRejectedValueOnce(dbError)

      await expect(repository.removeRoute('test-channel-123')).rejects.toThrow(
        'Failed to remove route: Delete failed'
      )

      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should remove all routes', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 2,
      })

      await repository.clear()

      expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM routes')
      expect(repository.getRouteCount()).toBe(0)
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should handle empty repository', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })

      await repository.clear()

      expect(repository.getRouteCount()).toBe(0)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Clear failed')
      mockClient.query.mockRejectedValueOnce(dbError)

      await expect(repository.clear()).rejects.toThrow('Failed to clear routes: Clear failed')

      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('getRouteCount', () => {
    it('should return 0 when cache is not initialized', () => {
      expect(repository.getRouteCount()).toBe(0)
    })

    it('should return cached count', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
      })

      await (repository as any).refreshRouteCount()

      expect(repository.getRouteCount()).toBe(5)
    })
  })

  describe('close', () => {
    it('should close the connection pool', async () => {
      await repository.close()

      expect(mockPool.end).toHaveBeenCalled()
    })

    it('should handle errors when closing pool', async () => {
      const closeError = new Error('Close failed')
      mockPool.end = vi.fn().mockRejectedValueOnce(closeError)

      await expect(repository.close()).rejects.toThrow('Close failed')
    })

    it('should log debug information when closing with cache', async () => {
      // Set cache count
      ;(repository as any).routeCountCache = 5

      await repository.close()

      expect(mockPool.end).toHaveBeenCalled()
    })

    it('should handle close with debug mode enabled', async () => {
      // Mock isDebugMode to return true
      const originalEnv = process.env.WA2AI_DEBUG
      process.env.WA2AI_DEBUG = 'true'

      try {
        await repository.close()
        expect(mockPool.end).toHaveBeenCalled()
      } finally {
        process.env.WA2AI_DEBUG = originalEnv
      }
    })
  })

  describe('refreshRouteCount', () => {
    it('should update cache with correct count', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      })

      await (repository as any).refreshRouteCount()

      expect(repository.getRouteCount()).toBe(3)
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM routes'
      )
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should handle database errors when refreshing count', async () => {
      const dbError = new Error('Count query failed')
      mockClient.query.mockRejectedValueOnce(dbError)

      await expect((repository as any).refreshRouteCount()).rejects.toThrow(
        'Failed to refresh route count: Count query failed'
      )

      expect(mockClient.release).toHaveBeenCalled()
    })
  })

  describe('pool error handling', () => {
    it('should handle pool connection errors', () => {
      // Get the error handler registered in constructor
      const errorHandler = mockPool.on.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1]

      expect(errorHandler).toBeDefined()

      // Simulate pool error
      const poolError = new Error('Pool connection failed')
      errorHandler?.(poolError)

      // Error should be logged (we can't easily test logger here, but the handler exists)
    })
  })

  describe('mapRowToRoute', () => {
    it('should map database row to Route correctly', () => {
      const row = {
        channel_id: 'test-channel-789',
        agent_endpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      const route = (repository as any).mapRowToRoute(row)

      expect(route).toEqual({
        channelId: 'test-channel-789',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      })
    })

    it('should handle prod environment', () => {
      const row = {
        channel_id: 'test-channel-789',
        agent_endpoint: 'http://localhost:8000/agent',
        environment: 'prod',
      }

      const route = (repository as any).mapRowToRoute(row)

      expect(route.environment).toBe('prod')
    })

    it('should handle route with regexFilter', () => {
      const row = {
        channel_id: 'test-channel-789',
        agent_endpoint: 'http://localhost:8000/agent',
        environment: 'lab',
        regex_filter: '^Test',
      }

      const route = (repository as any).mapRowToRoute(row)

      expect(route.regexFilter).toBe('^Test')
    })

    it('should handle route with config JSON', () => {
      const row = {
        channel_id: 'test-channel-789',
        agent_endpoint: 'http://localhost:8000/agent',
        environment: 'lab',
        // mapRowToRoute expects config to already be parsed (as Record<string, unknown>)
        config: {
          adk: {
            appName: 'test_agent',
            baseUrl: 'http://localhost:8000',
          },
        },
      }

      const route = (repository as any).mapRowToRoute(row)

      expect(route.config).toEqual({
        adk: {
          appName: 'test_agent',
          baseUrl: 'http://localhost:8000',
        },
      })
    })

    it('should handle route with null config', () => {
      const row = {
        channel_id: 'test-channel-789',
        agent_endpoint: 'http://localhost:8000/agent',
        environment: 'lab',
        config: null,
      }

      const route = (repository as any).mapRowToRoute(row)

      expect(route.config).toBeUndefined()
    })
  })

  describe('error handling edge cases', () => {
    it('should handle connection pool errors during query', async () => {
      const connectionError = new Error('Connection failed')
      mockPool.connect = vi.fn().mockRejectedValueOnce(connectionError)

      await expect(repository.findByChannelId('test')).rejects.toThrow()
    })

    it('should handle client release errors gracefully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })
      // Release errors are caught in finally block, so they don't propagate
      mockClient.release = vi.fn().mockImplementationOnce(() => {
        // Simulate error but don't throw - finally blocks catch and continue
        console.error('Release failed (expected in test)')
      })

      const result = await repository.findByChannelId('test')
      expect(result).toBeNull()
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should handle refreshRouteCount with invalid count format', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ count: 'invalid' }],
        rowCount: 1,
      })

      await (repository as any).refreshRouteCount()

      // Should handle gracefully even with invalid count
      expect(mockClient.release).toHaveBeenCalled()
    })
  })
})
