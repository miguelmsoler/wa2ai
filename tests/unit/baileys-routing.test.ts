/**
 * Unit tests for Baileys routing setup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupBaileysDirectRouting } from '../../router/src/providers/baileys-routing.js'
import type { MessageRouter } from '../../router/src/core/message-router.js'
import type { IncomingMessage } from '../../router/src/core/models.js'
import { getBaileysConnection } from '../../router/src/providers/baileys-connection.js'
import { logger, isDebugMode } from '../../router/src/core/logger.js'

// Mock logger
vi.mock('../../router/src/core/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  isDebugMode: vi.fn(() => false),
}))

// Mock baileys-connection
const mockConnection = {
  onMessage: vi.fn(),
  getMessageHandlerCount: vi.fn(() => 0),
}

vi.mock('../../router/src/providers/baileys-connection.js', () => ({
  getBaileysConnection: vi.fn(() => mockConnection),
}))

describe('BaileysRouting', () => {
  let mockMessageRouter: MessageRouter
  let messageHandler: (message: IncomingMessage) => Promise<any>

  beforeEach(() => {
    vi.clearAllMocks()
    mockConnection.onMessage.mockImplementation((handler) => {
      messageHandler = handler
    })
    mockConnection.getMessageHandlerCount.mockReturnValue(0)

    mockMessageRouter = {
      routeMessage: vi.fn().mockResolvedValue({
        success: true,
        response: 'Test response',
      }),
    } as unknown as MessageRouter
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('setupBaileysDirectRouting', () => {
    it('should register message handler with Baileys connection', () => {
      setupBaileysDirectRouting(mockMessageRouter)

      expect(getBaileysConnection).toHaveBeenCalled()
      expect(mockConnection.onMessage).toHaveBeenCalledTimes(1)
      expect(mockConnection.onMessage).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should log info message when setup completes', () => {
      setupBaileysDirectRouting(mockMessageRouter)

      expect(logger.info).toHaveBeenCalledWith(
        '[BaileysRouting] Baileys direct routing configured'
      )
    })

    it('should log debug message when DEBUG mode is enabled', () => {
      vi.mocked(isDebugMode).mockReturnValueOnce(true)

      setupBaileysDirectRouting(mockMessageRouter)

      expect(logger.debug).toHaveBeenCalledWith(
        '[BaileysRouting] Setting up Baileys direct routing'
      )
    })

    it('should not log debug message when DEBUG mode is disabled', () => {
      vi.mocked(isDebugMode).mockReturnValueOnce(false)

      setupBaileysDirectRouting(mockMessageRouter)

      expect(logger.debug).not.toHaveBeenCalledWith(
        '[BaileysRouting] Setting up Baileys direct routing'
      )
    })

    it('should route message through MessageRouter when handler is called', async () => {
      setupBaileysDirectRouting(mockMessageRouter)

      const testMessage: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello',
        timestamp: new Date(),
      }

      await messageHandler(testMessage)

      expect(mockMessageRouter.routeMessage).toHaveBeenCalledTimes(1)
      expect(mockMessageRouter.routeMessage).toHaveBeenCalledWith(testMessage)
    })

    it('should return result from MessageRouter', async () => {
      const expectedResult = {
        success: true,
        response: 'Custom response',
        metadata: { test: 'data' },
      }

      vi.mocked(mockMessageRouter.routeMessage).mockResolvedValueOnce(expectedResult)

      setupBaileysDirectRouting(mockMessageRouter)

      const testMessage: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello',
        timestamp: new Date(),
      }

      const result = await messageHandler(testMessage)

      expect(result).toEqual(expectedResult)
    })

    it('should log debug message when message is received in DEBUG mode', async () => {
      vi.mocked(isDebugMode).mockReturnValue(true)

      setupBaileysDirectRouting(mockMessageRouter)

      const testMessage: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello',
        timestamp: new Date(),
      }

      await messageHandler(testMessage)

      expect(logger.debug).toHaveBeenCalledWith(
        '[BaileysRouting] Baileys message received',
        {
          messageId: 'MSG001',
          channelId: 'test-channel-123',
        }
      )
    })

    it('should not log debug message when message is received in non-DEBUG mode', async () => {
      vi.mocked(isDebugMode).mockReturnValue(false)

      setupBaileysDirectRouting(mockMessageRouter)

      const testMessage: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello',
        timestamp: new Date(),
      }

      await messageHandler(testMessage)

      expect(logger.debug).not.toHaveBeenCalledWith(
        '[BaileysRouting] Baileys message received',
        expect.any(Object)
      )
    })

    it('should handle errors from MessageRouter gracefully', async () => {
      const routerError = new Error('Router error')
      vi.mocked(mockMessageRouter.routeMessage).mockRejectedValueOnce(routerError)

      setupBaileysDirectRouting(mockMessageRouter)

      const testMessage: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello',
        timestamp: new Date(),
      }

      await expect(messageHandler(testMessage)).rejects.toThrow('Router error')
    })

    it('should handle multiple message handlers independently', async () => {
      const mockMessageRouter2: MessageRouter = {
        routeMessage: vi.fn().mockResolvedValue({
          success: true,
          response: 'Response 2',
        }),
      } as unknown as MessageRouter

      setupBaileysDirectRouting(mockMessageRouter)
      setupBaileysDirectRouting(mockMessageRouter2)

      expect(mockConnection.onMessage).toHaveBeenCalledTimes(2)

      const testMessage: IncomingMessage = {
        id: 'MSG001',
        from: 'test-user-123@s.whatsapp.net',
        channelId: 'test-channel-123',
        text: 'Hello',
        timestamp: new Date(),
      }

      // Get the last registered handler
      const handlers = mockConnection.onMessage.mock.calls.map((call) => call[0])
      const lastHandler = handlers[handlers.length - 1]

      await lastHandler(testMessage)

      expect(mockMessageRouter2.routeMessage).toHaveBeenCalledWith(testMessage)
    })
  })
})
