/**
 * Structured logging utility for wa2ai router.
 * 
 * Provides conditional debug logging based on WA2AI_DEBUG environment variable.
 * Follows Clean Architecture principles - no external dependencies.
 */

/**
 * Log levels for structured logging.
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Log entry structure.
 */
interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
}

/**
 * Checks if debug mode is enabled.
 * Should be checked at runtime, not at module load time.
 */
function isDebugMode(): boolean {
  return process.env.WA2AI_DEBUG === 'true'
}

/**
 * Formats log entry as structured JSON string.
 */
function formatLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  }
  return JSON.stringify(entry)
}

/**
 * Structured logger following AGENTS.md guidelines.
 */
export const logger = {
  /**
   * Logs debug information (only in debug mode).
   * 
   * @param message - Debug message
   * @param context - Optional context object
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (isDebugMode()) {
      console.log(formatLogEntry(LogLevel.DEBUG, message, context))
    }
  },

  /**
   * Logs informational messages.
   * 
   * @param message - Info message
   * @param context - Optional context object
   */
  info(message: string, context?: Record<string, unknown>): void {
    console.log(formatLogEntry(LogLevel.INFO, message, context))
  },

  /**
   * Logs warning messages.
   * 
   * @param message - Warning message
   * @param context - Optional context object
   */
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatLogEntry(LogLevel.WARNING, message, context))
  },

  /**
   * Logs error messages.
   * 
   * @param message - Error message
   * @param context - Optional context object
   */
  error(message: string, context?: Record<string, unknown>): void {
    console.error(formatLogEntry(LogLevel.ERROR, message, context))
  },

  /**
   * Logs critical error messages.
   * 
   * @param message - Critical error message
   * @param context - Optional context object
   */
  critical(message: string, context?: Record<string, unknown>): void {
    console.error(formatLogEntry(LogLevel.CRITICAL, message, context))
  },
}

