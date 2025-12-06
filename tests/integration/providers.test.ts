/**
 * Integration tests for WhatsApp providers.
 * 
 * These tests verify provider implementations. Currently providers are stubs,
 * but when implemented, these tests will verify actual HTTP calls to external services.
 * 
 * Note: These tests avoid live network calls and use fixtures or recorded data.
 */
import { describe, it, expect } from 'vitest'
import { EvolutionProvider } from '../../router/src/providers/evolution-provider.js'
import { CloudApiProvider } from '../../router/src/providers/cloud-provider.js'
import type { OutgoingMessage } from '../../router/src/core/models.js'

describe('WhatsApp Providers', () => {
  describe('EvolutionProvider', () => {
    it('should be instantiable', () => {
      const provider = new EvolutionProvider({
        apiUrl: 'http://localhost:8080',
        apiKey: 'test-key',
      })

      expect(provider).toBeInstanceOf(EvolutionProvider)
    })

    it('should throw error when sendMessage is called (not yet implemented)', async () => {
      const provider = new EvolutionProvider({
        apiUrl: 'http://localhost:8080',
        apiKey: 'test-key',
      })

      const message: OutgoingMessage = {
        to: '1234567890',
        channelId: 'channel-1',
        text: 'Test',
      }

      await expect(provider.sendMessage(message)).rejects.toThrow(
        'EvolutionProvider.sendMessage not yet implemented'
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

