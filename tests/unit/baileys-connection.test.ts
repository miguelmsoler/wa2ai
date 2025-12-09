import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WASocket, ConnectionState } from '@whiskeysockets/baileys'

// Mock the external dependencies before importing the module
vi.mock('@whiskeysockets/baileys', () => ({
  default: vi.fn(),
  DisconnectReason: {
    loggedOut: 401,
    connectionClosed: 428,
    connectionLost: 408,
    connectionReplaced: 440,
    timedOut: 408,
    badSession: 500,
    restartRequired: 515,
  },
  useMultiFileAuthState: vi.fn(),
}))

vi.mock('qrcode', () => ({
  toDataURL: vi.fn(),
  toString: vi.fn(),
}))

// Import after mocking
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import * as qrcode from 'qrcode'
import {
  BaileysConnectionService,
  getBaileysConnection,
} from '../../router/src/providers/baileys-connection.js'

describe('BaileysConnectionService', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let mockSocket: Partial<WASocket>
  let connectionUpdateHandler: ((update: Partial<ConnectionState>) => void) | null = null

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as ReturnType<typeof vi.spyOn>

    // Reset handlers
    connectionUpdateHandler = null

    // Create mock socket with event emitter
    mockSocket = {
      ev: {
        on: vi.fn((event: string, handler: any) => {
          if (event === 'connection.update') {
            connectionUpdateHandler = handler
          }
          // creds.update handler is also registered but we don't need to track it
        }),
        off: vi.fn(),
        emit: vi.fn(),
        removeAllListeners: vi.fn(),
      } as any,
      end: vi.fn(),
    }

    // Mock useMultiFileAuthState
    vi.mocked(useMultiFileAuthState).mockResolvedValue({
      state: {
        creds: {} as any,
        keys: {} as any,
      },
      saveCreds: vi.fn(),
    })

    // Mock makeWASocket
    vi.mocked(makeWASocket).mockReturnValue(mockSocket as WASocket)

    // Mock qrcode - cast to any to avoid complex type issues with overloaded functions
    vi.mocked(qrcode.toDataURL as any).mockResolvedValue('data:image/png;base64,mockQRCode')
    vi.mocked(qrcode.toString as any).mockResolvedValue('Mock QR Terminal')

    // Reset environment
    delete process.env.WA2AI_DEBUG
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const service = new BaileysConnectionService()

      expect(service).toBeInstanceOf(BaileysConnectionService)
    })

    it('should create instance with custom configuration', () => {
      const service = new BaileysConnectionService({
        authDir: './custom_auth',
        printQRInTerminal: true,
      })

      expect(service).toBeInstanceOf(BaileysConnectionService)
    })
  })

  describe('getState', () => {
    it('should return disconnected state initially', () => {
      const service = new BaileysConnectionService()
      const state = service.getState()

      expect(state).toEqual({
        status: 'disconnected',
        qrCode: null,
        lastError: null,
      })
    })
  })

  describe('connect', () => {
    it('should initiate connection successfully', async () => {
      const service = new BaileysConnectionService()

      await service.connect()

      expect(useMultiFileAuthState).toHaveBeenCalled()
      expect(makeWASocket).toHaveBeenCalled()
      expect(mockSocket.ev?.on).toHaveBeenCalledWith('creds.update', expect.any(Function))
      expect(mockSocket.ev?.on).toHaveBeenCalledWith('connection.update', expect.any(Function))
    })

    it('should not reconnect if already connected', async () => {
      const service = new BaileysConnectionService()

      await service.connect()
      // Simulate connected state
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ connection: 'open' })
      }

      await service.connect()

      // makeWASocket should only be called once
      expect(makeWASocket).toHaveBeenCalledTimes(1)
    })

    it('should not reconnect if already connecting', async () => {
      const service = new BaileysConnectionService()

      // Start first connection
      const connectPromise = service.connect()

      // Try to connect again immediately
      await service.connect()
      await connectPromise

      // makeWASocket should only be called once
      expect(makeWASocket).toHaveBeenCalledTimes(1)
    })

    it('should log debug information when WA2AI_DEBUG is true', async () => {
      process.env.WA2AI_DEBUG = 'true'
      const service = new BaileysConnectionService()

      await service.connect()

      expect(consoleLogSpy).toHaveBeenCalled()
      // Check for debug log entries
      const debugLogs = consoleLogSpy.mock.calls.filter((call) => {
        try {
          const entry = JSON.parse(call[0] as string)
          return entry.level === 'DEBUG'
        } catch {
          return false
        }
      })
      expect(debugLogs.length).toBeGreaterThan(0)
    })
  })

  describe('connection.update handling', () => {
    it('should update state to qr_ready when QR code is received', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate QR code update
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ qr: 'mock-qr-code-string' })
      }

      const state = service.getState()
      expect(state.status).toBe('qr_ready')
      expect(state.qrCode).toBe('mock-qr-code-string')
    })

    it('should update state to connected when connection opens', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate connected state
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ connection: 'open' })
      }

      const state = service.getState()
      expect(state.status).toBe('connected')
      expect(state.qrCode).toBeNull()
      expect(state.lastError).toBeNull()
    })

    it('should update state to disconnected when connection closes', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate connection close
      if (connectionUpdateHandler) {
        connectionUpdateHandler({
          connection: 'close',
          lastDisconnect: {
            error: new Error('Connection lost'),
            date: new Date(),
          },
        })
      }

      const state = service.getState()
      expect(state.status).toBe('disconnected')
      expect(state.lastError).toBe('Connection lost')
    })

    it('should not schedule reconnection when logged out', async () => {
      vi.useFakeTimers()
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate logged out (401)
      const boomError = {
        output: { statusCode: DisconnectReason.loggedOut },
        message: 'Logged out',
      }
      if (connectionUpdateHandler) {
        connectionUpdateHandler({
          connection: 'close',
          lastDisconnect: {
            error: boomError as any,
            date: new Date(),
          },
        })
      }

      // Advance timers
      vi.advanceTimersByTime(60000)

      // Should not try to reconnect (makeWASocket only called once during initial connect)
      expect(makeWASocket).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })

    it('should clear QR code when connection opens', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate QR code first
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ qr: 'mock-qr-code-string' })
      }

      expect(service.getState().qrCode).toBe('mock-qr-code-string')

      // Then connect
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ connection: 'open' })
      }

      expect(service.getState().qrCode).toBeNull()
    })
  })

  describe('getQRCodeDataURL', () => {
    it('should return null when no QR code is available', async () => {
      const service = new BaileysConnectionService()

      const result = await service.getQRCodeDataURL()

      expect(result).toBeNull()
    })

    it('should return data URL when QR code is available', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate QR code
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ qr: 'mock-qr-code-string' })
      }

      const result = await service.getQRCodeDataURL()

      expect(result).toBe('data:image/png;base64,mockQRCode')
      expect(qrcode.toDataURL).toHaveBeenCalledWith('mock-qr-code-string', {
        width: 300,
        margin: 2,
      })
    })

    it('should return null and log error when QR generation fails', async () => {
      vi.mocked(qrcode.toDataURL).mockRejectedValue(new Error('QR generation failed'))

      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate QR code
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ qr: 'mock-qr-code-string' })
      }

      const result = await service.getQRCodeDataURL()

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('getQRCodeTerminal', () => {
    it('should return null when no QR code is available', async () => {
      const service = new BaileysConnectionService()

      const result = await service.getQRCodeTerminal()

      expect(result).toBeNull()
    })

    it('should return terminal string when QR code is available', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate QR code
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ qr: 'mock-qr-code-string' })
      }

      const result = await service.getQRCodeTerminal()

      expect(result).toBe('Mock QR Terminal')
      expect(qrcode.toString).toHaveBeenCalledWith('mock-qr-code-string', {
        type: 'terminal',
        small: true,
      })
    })
  })

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      const service = new BaileysConnectionService()

      expect(service.isConnected()).toBe(false)
    })

    it('should return true when connected', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate connected state
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ connection: 'open' })
      }

      expect(service.isConnected()).toBe(true)
    })
  })

  describe('hasQRCode', () => {
    it('should return false when no QR code is available', () => {
      const service = new BaileysConnectionService()

      expect(service.hasQRCode()).toBe(false)
    })

    it('should return true when QR code is available', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate QR code
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ qr: 'mock-qr-code-string' })
      }

      expect(service.hasQRCode()).toBe(true)
    })
  })

  describe('getSocket', () => {
    it('should return null when not connected', () => {
      const service = new BaileysConnectionService()

      expect(service.getSocket()).toBeNull()
    })

    it('should return socket after connect', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      expect(service.getSocket()).toBe(mockSocket)
    })
  })

  describe('disconnect', () => {
    it('should disconnect and reset state', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate connected state
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ connection: 'open' })
      }

      service.disconnect()

      expect(mockSocket.end).toHaveBeenCalled()
      expect(service.getState().status).toBe('disconnected')
      expect(service.getSocket()).toBeNull()
    })

    it('should handle disconnect when not connected', () => {
      const service = new BaileysConnectionService()

      // Should not throw
      expect(() => service.disconnect()).not.toThrow()
    })
  })

  describe('logging', () => {
    it('should log info when connection is initiated', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      const infoLogs = consoleLogSpy.mock.calls.filter((call) => {
        try {
          const entry = JSON.parse(call[0] as string)
          return entry.level === 'INFO' && entry.message.includes('Connection initiated')
        } catch {
          return false
        }
      })
      expect(infoLogs.length).toBeGreaterThan(0)
    })

    it('should log info when QR code is ready', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate QR code
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ qr: 'mock-qr-code-string' })
      }

      const infoLogs = consoleLogSpy.mock.calls.filter((call) => {
        try {
          const entry = JSON.parse(call[0] as string)
          return entry.level === 'INFO' && entry.message.includes('QR code ready')
        } catch {
          return false
        }
      })
      expect(infoLogs.length).toBeGreaterThan(0)
    })

    it('should log info when connected', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate connected state
      if (connectionUpdateHandler) {
        connectionUpdateHandler({ connection: 'open' })
      }

      const infoLogs = consoleLogSpy.mock.calls.filter((call) => {
        try {
          const entry = JSON.parse(call[0] as string)
          return entry.level === 'INFO' && entry.message.includes('Connected to WhatsApp')
        } catch {
          return false
        }
      })
      expect(infoLogs.length).toBeGreaterThan(0)
    })

    it('should log warning when connection closes', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate connection close
      if (connectionUpdateHandler) {
        connectionUpdateHandler({
          connection: 'close',
          lastDisconnect: {
            error: new Error('Connection lost'),
            date: new Date(),
          },
        })
      }

      const warnLogs = consoleWarnSpy.mock.calls.filter((call) => {
        try {
          const entry = JSON.parse(call[0] as string)
          return entry.level === 'WARNING' && entry.message.includes('Connection closed')
        } catch {
          return false
        }
      })
      expect(warnLogs.length).toBeGreaterThan(0)
    })

    it('should log error when logged out', async () => {
      const service = new BaileysConnectionService()
      await service.connect()

      // Simulate logged out
      const boomError = {
        output: { statusCode: DisconnectReason.loggedOut },
        message: 'Logged out',
      }
      if (connectionUpdateHandler) {
        connectionUpdateHandler({
          connection: 'close',
          lastDisconnect: {
            error: boomError as any,
            date: new Date(),
          },
        })
      }

      const errorLogs = consoleErrorSpy.mock.calls.filter((call) => {
        try {
          const entry = JSON.parse(call[0] as string)
          return entry.level === 'ERROR' && entry.message.includes('Logged out')
        } catch {
          return false
        }
      })
      expect(errorLogs.length).toBeGreaterThan(0)
    })
  })
})

describe('getBaileysConnection', () => {
  it('should return singleton instance', () => {
    // Note: This test verifies the singleton pattern
    // The actual singleton behavior depends on module caching
    const instance1 = getBaileysConnection()
    const instance2 = getBaileysConnection()

    expect(instance1).toBe(instance2)
  })
})
