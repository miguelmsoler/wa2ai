/**
 * Unit tests for routes repository.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryRoutesRepository } from '../../router/src/core/routes-repository.js'
import type { Route } from '../../router/src/core/models.js'

describe('InMemoryRoutesRepository', () => {
  let repository: InMemoryRoutesRepository

  beforeEach(() => {
    repository = new InMemoryRoutesRepository()
  })

  describe('findByChannelId', () => {
    it('should return null for non-existent channel', async () => {
      const result = await repository.findByChannelId('non-existent')
      expect(result).toBeNull()
    })

    it('should return route when channel exists', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      await repository.addRoute(route)
      const result = await repository.findByChannelId('test-channel-123')

      expect(result).toEqual(route)
    })

    it('should return null after route is removed', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      await repository.addRoute(route)
      await repository.removeRoute('test-channel-123')
      const result = await repository.findByChannelId('test-channel-123')

      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return empty array when no routes exist', async () => {
      const result = await repository.findAll()
      expect(result).toEqual([])
    })

    it('should return all routes', async () => {
      const route1: Route = {
        channelId: 'test-channel-111',
        agentEndpoint: 'http://localhost:8000/agent1',
        environment: 'lab',
      }
      const route2: Route = {
        channelId: 'test-channel-222',
        agentEndpoint: 'http://localhost:8000/agent2',
        environment: 'lab',
      }

      await repository.addRoute(route1)
      await repository.addRoute(route2)

      const result = await repository.findAll()
      expect(result).toHaveLength(2)
      expect(result).toContainEqual(route1)
      expect(result).toContainEqual(route2)
    })
  })

  describe('addRoute', () => {
    it('should add a route', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      await repository.addRoute(route)
      const result = await repository.findByChannelId('test-channel-123')

      expect(result).toEqual(route)
    })

    it('should overwrite existing route with same channelId', async () => {
      const route1: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent1',
        environment: 'lab',
      }
      const route2: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent2',
        environment: 'prod',
      }

      await repository.addRoute(route1)
      await repository.addRoute(route2)

      const result = await repository.findByChannelId('test-channel-123')
      expect(result).toEqual(route2)
    })

    it('should handle route with config', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
        config: {
          timeout: 5000,
          retries: 3,
        },
      }

      await repository.addRoute(route)
      const result = await repository.findByChannelId('test-channel-123')

      expect(result).toEqual(route)
      expect(result?.config).toEqual({ timeout: 5000, retries: 3 })
    })
  })

  describe('removeRoute', () => {
    it('should return false for non-existent route', async () => {
      const result = await repository.removeRoute('non-existent')
      expect(result).toBe(false)
    })

    it('should return true and remove existing route', async () => {
      const route: Route = {
        channelId: 'test-channel-123',
        agentEndpoint: 'http://localhost:8000/agent',
        environment: 'lab',
      }

      await repository.addRoute(route)
      const removed = await repository.removeRoute('test-channel-123')
      const found = await repository.findByChannelId('test-channel-123')

      expect(removed).toBe(true)
      expect(found).toBeNull()
    })
  })

  describe('clear', () => {
    it('should remove all routes', async () => {
      await repository.addRoute({
        channelId: 'test-channel-111',
        agentEndpoint: 'http://localhost:8000/agent1',
        environment: 'lab',
      })
      await repository.addRoute({
        channelId: 'test-channel-222',
        agentEndpoint: 'http://localhost:8000/agent2',
        environment: 'lab',
      })

      await repository.clear()
      const result = await repository.findAll()

      expect(result).toHaveLength(0)
    })
  })

  describe('getRouteCount', () => {
    it('should return 0 for empty repository', () => {
      expect(repository.getRouteCount()).toBe(0)
    })

    it('should return correct count after adding routes', async () => {
      expect(repository.getRouteCount()).toBe(0)

      await repository.addRoute({
        channelId: 'test-channel-111',
        agentEndpoint: 'http://localhost:8000/agent1',
        environment: 'lab',
      })
      expect(repository.getRouteCount()).toBe(1)

      await repository.addRoute({
        channelId: 'test-channel-222',
        agentEndpoint: 'http://localhost:8000/agent2',
        environment: 'lab',
      })
      expect(repository.getRouteCount()).toBe(2)

      await repository.removeRoute('test-channel-111')
      expect(repository.getRouteCount()).toBe(1)
    })
  })
})

