/**
 * Unit tests for logger utility (lib/logger.ts).
 * 
 * Tests structured logging functionality and debug mode behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger, isDebugMode, LogLevel } from '@/lib/utils/logger'

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let originalEnv: string | undefined

  beforeEach(() => {
    // Save original environment variable
    originalEnv = process.env.NEXT_PUBLIC_WA2AI_DEBUG

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore original environment variable
    process.env.NEXT_PUBLIC_WA2AI_DEBUG = originalEnv

    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('isDebugMode', () => {
    it('should return true when NEXT_PUBLIC_WA2AI_DEBUG is "true"', () => {
      process.env.NEXT_PUBLIC_WA2AI_DEBUG = 'true'
      expect(isDebugMode()).toBe(true)
    })

    it('should return false when NEXT_PUBLIC_WA2AI_DEBUG is not "true"', () => {
      process.env.NEXT_PUBLIC_WA2AI_DEBUG = 'false'
      expect(isDebugMode()).toBe(false)

      process.env.NEXT_PUBLIC_WA2AI_DEBUG = undefined
      expect(isDebugMode()).toBe(false)

      process.env.NEXT_PUBLIC_WA2AI_DEBUG = ''
      expect(isDebugMode()).toBe(false)
    })
  })

  describe('logger.debug', () => {
    it('should log debug message when debug mode is enabled', () => {
      process.env.NEXT_PUBLIC_WA2AI_DEBUG = 'true'

      logger.debug('Test debug message', { key: 'value' })

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.DEBUG)
      expect(logEntry.message).toBe('Test debug message')
      expect(logEntry.context).toEqual({ key: 'value' })
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should not log debug message when debug mode is disabled', () => {
      process.env.NEXT_PUBLIC_WA2AI_DEBUG = 'false'

      logger.debug('Test debug message')

      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should log debug message without context', () => {
      process.env.NEXT_PUBLIC_WA2AI_DEBUG = 'true'

      logger.debug('Test debug message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.DEBUG)
      expect(logEntry.message).toBe('Test debug message')
      expect(logEntry.context).toBeUndefined()
    })
  })

  describe('logger.info', () => {
    it('should log info message', () => {
      logger.info('Test info message', { key: 'value' })

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.INFO)
      expect(logEntry.message).toBe('Test info message')
      expect(logEntry.context).toEqual({ key: 'value' })
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should log info message without context', () => {
      logger.info('Test info message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.INFO)
      expect(logEntry.message).toBe('Test info message')
      expect(logEntry.context).toBeUndefined()
    })

    it('should always log info message regardless of debug mode', () => {
      process.env.NEXT_PUBLIC_WA2AI_DEBUG = 'false'

      logger.info('Test info message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('logger.warn', () => {
    it('should log warning message', () => {
      logger.warn('Test warning message', { key: 'value' })

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleWarnSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.WARNING)
      expect(logEntry.message).toBe('Test warning message')
      expect(logEntry.context).toEqual({ key: 'value' })
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should log warning message without context', () => {
      logger.warn('Test warning message')

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleWarnSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.WARNING)
      expect(logEntry.message).toBe('Test warning message')
    })
  })

  describe('logger.error', () => {
    it('should log error message', () => {
      logger.error('Test error message', { key: 'value', error: 'Error details' })

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.ERROR)
      expect(logEntry.message).toBe('Test error message')
      expect(logEntry.context).toEqual({ key: 'value', error: 'Error details' })
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should log error message without context', () => {
      logger.error('Test error message')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.ERROR)
      expect(logEntry.message).toBe('Test error message')
    })
  })

  describe('logger.critical', () => {
    it('should log critical error message', () => {
      logger.critical('Test critical message', { key: 'value', error: 'Critical error' })

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.CRITICAL)
      expect(logEntry.message).toBe('Test critical message')
      expect(logEntry.context).toEqual({ key: 'value', error: 'Critical error' })
      expect(logEntry.timestamp).toBeDefined()
    })

    it('should log critical message without context', () => {
      logger.critical('Test critical message')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const logCall = consoleErrorSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe(LogLevel.CRITICAL)
      expect(logEntry.message).toBe('Test critical message')
    })
  })

  describe('Log entry format', () => {
    it('should include ISO timestamp in log entries', () => {
      logger.info('Test message')

      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(new Date(logEntry.timestamp).getTime()).toBeGreaterThan(0)
    })

    it('should handle complex context objects', () => {
      const complexContext = {
        nested: {
          object: {
            with: {
              deep: 'values',
            },
          },
        },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
        boolean: true,
        number: 42,
      }

      logger.info('Test message', complexContext)

      const logCall = consoleLogSpy.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context).toEqual(complexContext)
    })
  })
})
