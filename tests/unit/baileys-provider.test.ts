/**
 * Unit tests for BaileysProvider.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BaileysProvider } from '../../router/src/providers/baileys-provider.js'
import { getBaileysConnection } from '../../router/src/providers/baileys-connection.js'
import type { OutgoingMessage } from '../../router/src/core/models.js'

// Mock BaileysConnectionService
vi.mock('../../router/src/providers/baileys-connection.js', () => {
  const mockConnectionService = {
    getState: vi.fn(),
    sendTextMessage: vi.fn(),
  }

  return {
    getBaileysConnection: vi.fn(() => mockConnectionService),
  }
})

describe('BaileysProvider', () => {
  let mockConnectionService: ReturnType<typeof getBaileysConnection>

  beforeEach(() => {
    vi.clearAllMocks()
    mockConnectionService = getBaileysConnection()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default connection service', () => {
      const provider = new BaileysProvider()
      expect(provider).toBeInstanceOf(BaileysProvider)
      expect(getBaileysConnection).toHaveBeenCalled()
    })

    it('should create instance with custom connection service', () => {
      const customConnection = getBaileysConnection()
      const provider = new BaileysProvider({ connectionService: customConnection })
      expect(provider).toBeInstanceOf(BaileysProvider)
    })
  })

  describe('sendMessage', () => {
    const message: OutgoingMessage = {
      to: 'test-user-123@s.whatsapp.net',
      channelId: 'test-channel-123',
      text: 'Test message',
    }

    it('should send message successfully when connected', async () => {
      vi.mocked(mockConnectionService.getState).mockReturnValue({
        status: 'connected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })
      vi.mocked(mockConnectionService.sendTextMessage).mockResolvedValue(undefined)

      const provider = new BaileysProvider()
      await provider.sendMessage(message)

      expect(mockConnectionService.sendTextMessage).toHaveBeenCalledWith(
        'test-user-123@s.whatsapp.net',
        'Test message'
      )
    })

    it('should add @s.whatsapp.net suffix if not present', async () => {
      const messageWithoutJid: OutgoingMessage = {
        to: 'test-user-123',
        channelId: 'test-channel-123',
        text: 'Test message',
      }

      vi.mocked(mockConnectionService.getState).mockReturnValue({
        status: 'connected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })
      vi.mocked(mockConnectionService.sendTextMessage).mockResolvedValue(undefined)

      const provider = new BaileysProvider()
      await provider.sendMessage(messageWithoutJid)

      expect(mockConnectionService.sendTextMessage).toHaveBeenCalledWith(
        'test-user-123@s.whatsapp.net',
        'Test message'
      )
    })

    it('should preserve @g.us suffix for group messages', async () => {
      const groupMessage: OutgoingMessage = {
        to: 'test-group-123@g.us',
        channelId: 'test-channel-123',
        text: 'Group message',
      }

      vi.mocked(mockConnectionService.getState).mockReturnValue({
        status: 'connected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })
      vi.mocked(mockConnectionService.sendTextMessage).mockResolvedValue(undefined)

      const provider = new BaileysProvider()
      await provider.sendMessage(groupMessage)

      expect(mockConnectionService.sendTextMessage).toHaveBeenCalledWith(
        'test-group-123@g.us',
        'Group message'
      )
    })

    it('should throw error when connection is not ready', async () => {
      vi.mocked(mockConnectionService.getState).mockReturnValue({
        status: 'disconnected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })

      const provider = new BaileysProvider()

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'Failed to send message via Baileys'
      )

      expect(mockConnectionService.sendTextMessage).not.toHaveBeenCalled()
    })

    it('should throw error when connection is connecting', async () => {
      vi.mocked(mockConnectionService.getState).mockReturnValue({
        status: 'connecting',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })

      const provider = new BaileysProvider()

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'Failed to send message via Baileys'
      )
    })

    it('should throw error when sendTextMessage fails', async () => {
      vi.mocked(mockConnectionService.getState).mockReturnValue({
        status: 'connected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })
      vi.mocked(mockConnectionService.sendTextMessage).mockRejectedValue(
        new Error('Send failed')
      )

      const provider = new BaileysProvider()

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'Failed to send message via Baileys'
      )
    })

    it('should handle messages with metadata', async () => {
      const messageWithMetadata: OutgoingMessage = {
        to: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Message with metadata',
        metadata: { customField: 'value' },
      }

      vi.mocked(mockConnectionService.getState).mockReturnValue({
        status: 'connected',
        qrCode: null,
        lastError: null,
        lastDisconnectReason: null,
        lastDisconnectDescription: null,
        reconnectAttempt: 0,
        needsCredentialsClear: false,
      })
      vi.mocked(mockConnectionService.sendTextMessage).mockResolvedValue(undefined)

      const provider = new BaileysProvider()
      await provider.sendMessage(messageWithMetadata)

      // Metadata is not sent to Baileys, only text
      expect(mockConnectionService.sendTextMessage).toHaveBeenCalledWith(
        'test-user-123@s.whatsapp.net',
        'Message with metadata'
      )
    })
  })
})
