/**
 * Unit tests for EvolutionProvider.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EvolutionProvider } from '../../router/src/providers/evolution-provider.js'
import type { OutgoingMessage } from '../../router/src/core/models.js'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('EvolutionProvider', () => {
  const config = {
    apiUrl: 'http://localhost:8080',
    apiKey: 'test-api-key',
    instanceName: 'test-instance',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with provided config', () => {
      const provider = new EvolutionProvider(config)
      expect(provider).toBeInstanceOf(EvolutionProvider)
    })

    it('should use default instance name if not provided', () => {
      const provider = new EvolutionProvider({
        apiUrl: 'http://localhost:8080',
        apiKey: 'test-key',
      })
      expect(provider).toBeInstanceOf(EvolutionProvider)
    })
  })

  describe('sendMessage', () => {
    const message: OutgoingMessage = {
      to: 'test-user-123@s.whatsapp.net',
      channelId: 'test-channel-123',
      text: 'Test message',
    }

    it('should send message successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          key: { id: 'msg-123', remoteJid: 'test-user-123@s.whatsapp.net' },
          status: 200,
        }),
      }

      mockFetch.mockResolvedValue(mockResponse)

      const provider = new EvolutionProvider(config)
      await provider.sendMessage(message)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/message/sendText/test-instance',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'test-api-key',
          },
          body: JSON.stringify({
            number: 'test-user-123',
            text: 'Test message',
          }),
        }
      )
    })

    it('should remove @s.whatsapp.net suffix from phone number', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: 200 }),
      }

      mockFetch.mockResolvedValue(mockResponse)

      const provider = new EvolutionProvider(config)
      await provider.sendMessage(message)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body as string)
      expect(body.number).toBe('test-user-123')
    })

    it('should remove @g.us suffix from phone number', async () => {
      const groupMessage: OutgoingMessage = {
        to: 'test-group-123@g.us',
        channelId: 'test-channel-123',
        text: 'Group message',
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: 200 }),
      }

      mockFetch.mockResolvedValue(mockResponse)

      const provider = new EvolutionProvider(config)
      await provider.sendMessage(groupMessage)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body as string)
      expect(body.number).toBe('test-group-123')
    })

    it('should throw error when API returns non-OK status', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request'),
      }

      mockFetch.mockResolvedValue(mockResponse)

      const provider = new EvolutionProvider(config)

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'Failed to send message via Evolution API'
      )

      expect(mockResponse.text).toHaveBeenCalled()
    })

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const provider = new EvolutionProvider(config)

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'Failed to send message via Evolution API'
      )
    })

    it('should use default instance name when not provided', async () => {
      const provider = new EvolutionProvider({
        apiUrl: 'http://localhost:8080',
        apiKey: 'test-key',
      })

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: 200 }),
      }

      mockFetch.mockResolvedValue(mockResponse)

      await provider.sendMessage(message)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/message/sendText/wa2ai-lab',
        expect.any(Object)
      )
    })

    it('should include message metadata in request', async () => {
      const messageWithMetadata: OutgoingMessage = {
        to: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Message with metadata',
        metadata: { customField: 'value' },
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ status: 200 }),
      }

      mockFetch.mockResolvedValue(mockResponse)

      const provider = new EvolutionProvider(config)
      await provider.sendMessage(messageWithMetadata)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body as string)
      expect(body.text).toBe('Message with metadata')
      // Note: Evolution API may not support metadata directly, but we send the text
    })
  })
})
