/**
 * Unit tests for agent client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AgentClient } from '../../router/src/core/agent-client.js'
import type { IncomingMessage } from '../../router/src/core/models.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('AgentClient', () => {
  let client: AgentClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockClear()
    client = new AgentClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    const mockMessage: IncomingMessage = {
      id: 'MSG001',
      from: '5491155551234@s.whatsapp.net',
      channelId: '5491155551234',
      text: 'Hello, agent!',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      metadata: { messageType: 'conversation' },
    }

    it('should send message successfully', async () => {
      const mockResponse = {
        success: true,
        response: 'Hello, user!',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.sendMessage('http://localhost:8000/agent', mockMessage)

      expect(result).toEqual(mockResponse)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/agent',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            id: mockMessage.id,
            from: mockMessage.from,
            channelId: mockMessage.channelId,
            text: mockMessage.text,
            timestamp: mockMessage.timestamp.toISOString(),
            metadata: mockMessage.metadata,
          }),
        })
      )
    })

    it('should handle agent error response', async () => {
      const mockResponse = {
        success: false,
        error: 'Agent processing failed',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.sendMessage('http://localhost:8000/agent', mockMessage)

      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(false)
    })

    it('should throw error on HTTP error status', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      await expect(
        client.sendMessage('http://localhost:8000/agent', mockMessage)
      ).rejects.toThrow('Agent endpoint returned 500')
    })

    it('should throw error on network failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        client.sendMessage('http://localhost:8000/agent', mockMessage)
      ).rejects.toThrow('Failed to send message to agent: Network error')
    })

    // Note: Timeout behavior is tested indirectly through error handling
    // Direct timeout testing requires fake timers which don't work well with fetch

    it('should include custom headers', async () => {
      const customClient = new AgentClient({
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      })

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await customClient.sendMessage('http://localhost:8000/agent', mockMessage)

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/agent',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'value',
          }),
        })
      )
    })

    it('should handle response without response field', async () => {
      const mockResponse = {
        success: true,
        metadata: { processed: true },
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await client.sendMessage('http://localhost:8000/agent', mockMessage)

      expect(result.success).toBe(true)
      expect(result.response).toBeUndefined()
      expect(result.metadata).toEqual({ processed: true })
    })
  })

  describe('isValidEndpoint', () => {
    it('should validate HTTP URLs', () => {
      expect(AgentClient.isValidEndpoint('http://localhost:8000/agent')).toBe(true)
      expect(AgentClient.isValidEndpoint('http://example.com/agent')).toBe(true)
    })

    it('should validate HTTPS URLs', () => {
      expect(AgentClient.isValidEndpoint('https://example.com/agent')).toBe(true)
      expect(AgentClient.isValidEndpoint('https://api.example.com/v1/agent')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(AgentClient.isValidEndpoint('not-a-url')).toBe(false)
      expect(AgentClient.isValidEndpoint('ftp://example.com')).toBe(false)
      expect(AgentClient.isValidEndpoint('')).toBe(false)
    })

    it('should reject URLs without protocol', () => {
      expect(AgentClient.isValidEndpoint('localhost:8000/agent')).toBe(false)
      expect(AgentClient.isValidEndpoint('example.com/agent')).toBe(false)
    })
  })
})

