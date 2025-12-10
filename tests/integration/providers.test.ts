/**
 * Integration tests for WhatsApp providers.
 * 
 * These tests verify provider implementations using mocked HTTP responses.
 * 
 * Note: These tests avoid live network calls and use mocked fetch responses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EvolutionProvider } from '../../router/src/providers/evolution-provider.js'
import { CloudApiProvider } from '../../router/src/providers/cloud-provider.js'
import type { OutgoingMessage } from '../../router/src/core/models.js'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Mock BaileysConnectionService
const mockConnectionService = {
  getState: vi.fn(),
  sendTextMessage: vi.fn(),
}

vi.mock('../../router/src/providers/baileys-connection.js', () => ({
  getBaileysConnection: vi.fn(() => mockConnectionService),
}))

describe('WhatsApp Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('EvolutionProvider', () => {
    it('should be instantiable', () => {
      const provider = new EvolutionProvider({
        apiUrl: 'http://localhost:8080',
        apiKey: 'test-key',
      })

      expect(provider).toBeInstanceOf(EvolutionProvider)
    })

    it('should send message successfully via Evolution API', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          key: { id: 'msg-123', remoteJid: '1234567890@s.whatsapp.net' },
          status: 200,
        }),
      }

      mockFetch.mockResolvedValue(mockResponse)

      const provider = new EvolutionProvider({
        apiUrl: 'http://localhost:8080',
        apiKey: 'test-key',
        instanceName: 'test-instance',
      })

      const message: OutgoingMessage = {
        to: '1234567890@s.whatsapp.net',
        channelId: 'channel-1',
        text: 'Test message',
      }

      await provider.sendMessage(message)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/message/sendText/test-instance',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'apikey': 'test-key',
          }),
        })
      )
    })

    it('should handle API error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized'),
      }

      mockFetch.mockResolvedValue(mockResponse)

      const provider = new EvolutionProvider({
        apiUrl: 'http://localhost:8080',
        apiKey: 'invalid-key',
      })

      const message: OutgoingMessage = {
        to: '1234567890@s.whatsapp.net',
        channelId: 'channel-1',
        text: 'Test',
      }

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'Failed to send message via Evolution API'
      )
    })
  })

  describe('BaileysProvider', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should be instantiable', async () => {
      const { BaileysProvider } = await import('../../router/src/providers/baileys-provider.js')
      const provider = new BaileysProvider()

      expect(provider).toBeInstanceOf(BaileysProvider)
    })

    it('should send message when connection is ready', async () => {
      // Mock connection state as connected
      mockConnectionService.getState.mockReturnValue({
        status: 'connected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })
      mockConnectionService.sendTextMessage.mockResolvedValue(undefined)

      const { BaileysProvider } = await import('../../router/src/providers/baileys-provider.js')
      const provider = new BaileysProvider()

      const message: OutgoingMessage = {
        to: '1234567890@s.whatsapp.net',
        channelId: 'channel-1',
        text: 'Test message',
      }

      await provider.sendMessage(message)

      expect(mockConnectionService.sendTextMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        'Test message'
      )
    })

    it('should handle connection not ready error', async () => {
      // Mock connection state as disconnected
      mockConnectionService.getState.mockReturnValue({
        status: 'disconnected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })

      const { BaileysProvider } = await import('../../router/src/providers/baileys-provider.js')
      const provider = new BaileysProvider()

      const message: OutgoingMessage = {
        to: '1234567890@s.whatsapp.net',
        channelId: 'channel-1',
        text: 'Test',
      }

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'Failed to send message via Baileys'
      )
    })
  })

  describe('CloudApiProvider', () => {
    it('should be instantiable', () => {
      const provider = new CloudApiProvider({
        accessToken: 'test-token',
        phoneNumberId: 'test-phone-id',
      })

      expect(provider).toBeInstanceOf(CloudApiProvider)
    })

    it('should throw error when sendMessage is called (not yet implemented)', async () => {
      const provider = new CloudApiProvider({
        accessToken: 'test-token',
        phoneNumberId: 'test-phone-id',
      })

      const message: OutgoingMessage = {
        to: '1234567890',
        channelId: 'channel-1',
        text: 'Test',
      }

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'CloudApiProvider.sendMessage not yet implemented'
      )
    })
  })
})

