import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, LogLevel } from '../../router/src/core/logger.js'

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as any
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}) as any
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as any
    // Reset environment variable
    delete process.env.WA2AI_DEBUG
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('info', () => {
    it('should log info messages with structured format', () => {
      logger.info('Test info message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.INFO)
      expect(logEntry.message).toBe('Test info message')
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should include context in log entry', () => {
      const context = { userId: '123', action: 'test' }
      logger.info('Test info message', context)

      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toEqual(context)
    })
  })

  describe('warn', () => {
    it('should log warning messages with structured format', () => {
      logger.warn('Test warning message')

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleWarnSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.WARNING)
      expect(logEntry.message).toBe('Test warning message')
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should include context in log entry', () => {
      const context = { errorCode: 'W001' }
      logger.warn('Test warning message', context)

      const logCall = consoleWarnSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toEqual(context)
    })
  })

  describe('error', () => {
    it('should log error messages with structured format', () => {
      logger.error('Test error message')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.ERROR)
      expect(logEntry.message).toBe('Test error message')
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should include context in log entry', () => {
      const context = { error: 'Something went wrong' }
      logger.error('Test error message', context)

      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toEqual(context)
    })
  })

  describe('critical', () => {
    it('should log critical messages with structured format', () => {
      logger.critical('Test critical message')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.CRITICAL)
      expect(logEntry.message).toBe('Test critical message')
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should include context in log entry', () => {
      const context = { component: 'server', status: 'down' }
      logger.critical('Test critical message', context)

      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toEqual(context)
    })
  })

  describe('debug', () => {
    it('should NOT log debug messages when WA2AI_DEBUG is not set', () => {
      delete process.env.WA2AI_DEBUG

      logger.debug('Test debug message')

      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should NOT log debug messages when WA2AI_DEBUG is false', () => {
      process.env.WA2AI_DEBUG = 'false'

      logger.debug('Test debug message')

      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should log debug messages when WA2AI_DEBUG is true', () => {
      process.env.WA2AI_DEBUG = 'true'

      logger.debug('Test debug message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.DEBUG)
      expect(logEntry.message).toBe('Test debug message')
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should include context in debug log entry when debug mode is enabled', () => {
      process.env.WA2AI_DEBUG = 'true'
      const context = { step: 'validation', data: 'test' }

      logger.debug('Test debug message', context)

      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toEqual(context)
    })
  })

  describe('log entry structure', () => {
    it('should include timestamp in ISO format', () => {
      logger.info('Test message')

      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(new Date(logEntry.timestamp).toISOString()).toBe(logEntry.timestamp)
    })

    it('should handle undefined context gracefully', () => {
      logger.info('Test message', undefined)

      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toBeUndefined()
    })

    it('should handle empty context object', () => {
      logger.info('Test message', {})

      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toEqual({})
    })
  })
})

