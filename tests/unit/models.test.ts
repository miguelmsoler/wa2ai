import { describe, it, expect } from 'vitest'
import type { IncomingMessage, OutgoingMessage, Route } from '../../router/src/core/models.js'

describe('Domain Models', () => {
  describe('IncomingMessage', () => {
    it('should have required fields', () => {
      const message: IncomingMessage = {
        id: 'msg-123',
        from: '1234567890',
        channelId: 'channel-1',
        text: 'Hello',
        timestamp: new Date(),
      }

      expect(message.id).toBe('msg-123')
      expect(message.from).toBe('1234567890')
      expect(message.channelId).toBe('channel-1')
      expect(message.text).toBe('Hello')
      expect(message.timestamp).toBeInstanceOf(Date)
    })

    it('should allow optional metadata', () => {
      const message: IncomingMessage = {
        id: 'msg-123',
        from: '1234567890',
        channelId: 'channel-1',
        text: 'Hello',
        timestamp: new Date(),
        metadata: { source: 'whatsapp' },
      }

      expect(message.metadata).toEqual({ source: 'whatsapp' })
    })
  })

  describe('OutgoingMessage', () => {
    it('should have required fields', () => {
      const message: OutgoingMessage = {
        to: '1234567890',
        channelId: 'channel-1',
        text: 'Response',
      }

      expect(message.to).toBe('1234567890')
      expect(message.channelId).toBe('channel-1')
      expect(message.text).toBe('Response')
    })

    it('should allow optional metadata', () => {
      const message: OutgoingMessage = {
        to: '1234567890',
        channelId: 'channel-1',
        text: 'Response',
        metadata: { type: 'text' },
      }

      expect(message.metadata).toEqual({ type: 'text' })
    })
  })

  describe('Route', () => {
    it('should have required fields', () => {
      const route: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      expect(route.channelId).toBe('channel-1')
      expect(route.agentEndpoint).toBe('http://localhost:8000')
      expect(route.environment).toBe('lab')
    })

    it('should allow optional config', () => {
      const route: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'prod',
        config: { timeout: 5000 },
      }

      expect(route.config).toEqual({ timeout: 5000 })
    })

    it('should accept both lab and prod environments', () => {
      const labRoute: Route = {
        channelId: 'channel-1',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      const prodRoute: Route = {
        channelId: 'channel-2',
        agentEndpoint: 'http://localhost:8000',
        environment: 'prod',
      }

      expect(labRoute.environment).toBe('lab')
      expect(prodRoute.environment).toBe('prod')
    })
  })
})

