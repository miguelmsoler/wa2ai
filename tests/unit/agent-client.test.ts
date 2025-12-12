/**
 * Unit tests for agent client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HttpAgentClient } from '../../router/src/infra/http-agent-client.js'
import type { AgentClient } from '../../router/src/core/agent-client.js'
import type { IncomingMessage } from '../../router/src/core/models.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('HttpAgentClient', () => {
  let client: AgentClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockClear()
    client = new HttpAgentClient({
      timeout: 30000,
      adk: {
        appName: 'test_agent',
        baseUrl: 'http://localhost:8000',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    const mockMessage: IncomingMessage = {
      id: 'MSG001',
      from: 'test-user-123@s.whatsapp.net',
      channelId: 'test-channel-123',
      text: 'Hello, agent!',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      metadata: { messageType: 'conversation' },
    }

    it('should send ADK message successfully', async () => {
      // ADK returns array of events
      const mockAdkResponse = [
        {
          content: {
            parts: [{ text: 'Hello, user!' }],
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

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdkResponse,
      })

      const result = await client.sendMessage('http://localhost:8000', mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBe('Hello, user!')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/run',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"app_name":"test_agent"'),
        })
      )
    })

    it('should handle ADK response with no model events', async () => {
      // ADK returns empty events array
      const mockAdkResponse: any[] = []

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdkResponse,
      })

      const result = await client.sendMessage('http://localhost:8000', mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })

    it('should throw error on HTTP error status', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(
        client.sendMessage('http://localhost:8000', mockMessage)
      ).rejects.toThrow('ADK agent endpoint returned 500')
    })

    it('should throw error on network failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        client.sendMessage('http://localhost:8000', mockMessage)
      ).rejects.toThrow('Failed to send message to ADK agent: Network error')
    })

    // Note: Timeout behavior is tested indirectly through error handling
    // Direct timeout testing requires fake timers which don't work well with fetch

    it('should include custom headers', async () => {
      const customClient = new HttpAgentClient({
        timeout: 30000,
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value',
        },
        adk: {
          appName: 'test_agent',
          baseUrl: 'http://localhost:8000',
        },
      })

      const mockAdkResponse = [
        {
          content: {
            parts: [{ text: 'Response' }],
            role: 'model',
          },
          invocationId: 'e-test',
          author: 'model',
          actions: { stateDelta: {}, artifactDelta: {} },
        },
      ]

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdkResponse,
      })

      await customClient.sendMessage('http://localhost:8000', mockMessage)

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/run',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'value',
          }),
        })
      )
    })

    it('should handle ADK response with only user events', async () => {
      // ADK returns only user event (no model response)
      const mockAdkResponse = [
        {
          content: {
            parts: [{ text: 'User message' }],
            role: 'user',
          },
          invocationId: 'e-test',
          author: 'user',
          actions: { stateDelta: {}, artifactDelta: {} },
        },
      ]

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAdkResponse,
      })

      const result = await client.sendMessage('http://localhost:8000', mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
    })
  })

  describe('isValidEndpoint', () => {
    it('should validate HTTP URLs', () => {
      expect(HttpAgentClient.isValidEndpoint('http://localhost:8000/agent')).toBe(true)
      expect(HttpAgentClient.isValidEndpoint('http://example.com/agent')).toBe(true)
    })

    it('should validate HTTPS URLs', () => {
      expect(HttpAgentClient.isValidEndpoint('https://example.com/agent')).toBe(true)
      expect(HttpAgentClient.isValidEndpoint('https://api.example.com/v1/agent')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(HttpAgentClient.isValidEndpoint('not-a-url')).toBe(false)
      expect(HttpAgentClient.isValidEndpoint('ftp://example.com')).toBe(false)
      expect(HttpAgentClient.isValidEndpoint('')).toBe(false)
    })

    it('should reject URLs without protocol', () => {
      expect(HttpAgentClient.isValidEndpoint('localhost:8000/agent')).toBe(false)
      expect(HttpAgentClient.isValidEndpoint('example.com/agent')).toBe(false)
    })
  })
})

