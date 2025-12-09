/**
 * Baileys connection service.
 * 
 * This service manages the WhatsApp connection via Baileys,
 * handles QR code generation, and connection state management.
 * 
 * @module providers/baileys-connection
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
  type ConnectionState,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as qrcode from 'qrcode'
import { logger, isDebugMode } from '../core/logger.js'

/**
 * Connection status for the Baileys service.
 */
export type BaileysConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'qr_ready'
  | 'connected'

/**
 * Connection state information.
 */
export interface BaileysConnectionState {
  /** Current connection status */
  status: BaileysConnectionStatus
  /** Current QR code string (if available) */
  qrCode: string | null
  /** Last error message (if any) */
  lastError: string | null
}

/**
 * Configuration for Baileys connection service.
 */
export interface BaileysConnectionConfig {
  /** Directory to store authentication state */
  authDir?: string
  /** Whether to print QR in terminal (for debugging) */
  printQRInTerminal?: boolean
}

/**
 * Service that manages the Baileys WhatsApp connection.
 * 
 * This service handles:
 * - WebSocket connection to WhatsApp
 * - QR code generation and storage
 * - Connection state management
 * - Automatic reconnection logic
 * 
 * @example
 * ```typescript
 * const connection = new BaileysConnectionService({ authDir: './auth' })
 * await connection.connect()
 * const state = connection.getState()
 * if (state.qrCode) {
 *   const qrImage = await connection.getQRCodeDataURL()
 *   // Display QR to user
 * }
 * ```
 */
export class BaileysConnectionService {
  private socket: WASocket | null = null
  private currentQR: string | null = null
  private status: BaileysConnectionStatus = 'disconnected'
  private lastError: string | null = null
  private config: Required<BaileysConnectionConfig>
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(config: BaileysConnectionConfig = {}) {
    this.config = {
      authDir: config.authDir || './auth_info_baileys',
      printQRInTerminal: config.printQRInTerminal ?? isDebugMode(),
    }
  }

  /**
   * Initiates connection to WhatsApp via Baileys.
   * 
   * This method starts the connection process. If not authenticated,
   * a QR code will be generated that needs to be scanned.
   * 
   * @returns Promise that resolves when connection attempt starts
   * 
   * @example
   * ```typescript
   * await connection.connect()
   * ```
   */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      if (isDebugMode()) {
        logger.debug('[BaileysConnection] Already connected or connecting', {
          status: this.status,
        })
      }
      return
    }

    this.status = 'connecting'
    this.lastError = null

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.config.authDir)

      if (isDebugMode()) {
        logger.debug('[BaileysConnection] Auth state loaded', {
          authDir: this.config.authDir,
        })
      }

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: this.config.printQRInTerminal,
      })

      // Handle credentials updates
      this.socket.ev.on('creds.update', saveCreds)

      // Handle connection updates
      this.socket.ev.on('connection.update', (update) => {
        this.handleConnectionUpdate(update)
      })

      logger.info('[BaileysConnection] Connection initiated')
    } catch (error) {
      this.status = 'disconnected'
      this.lastError = error instanceof Error ? error.message : String(error)
      logger.error('[BaileysConnection] Failed to initiate connection', {
        error: this.lastError,
      })
      throw error
    }
  }

  /**
   * Handles connection state updates from Baileys.
   * 
   * @param update - Connection update from Baileys
   */
  private handleConnectionUpdate(update: Partial<ConnectionState>): void {
    const { connection, lastDisconnect, qr } = update

    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Connection update', {
        connection,
        hasQR: !!qr,
        lastDisconnect: lastDisconnect?.error?.message,
      })
    }

    // Handle QR code
    if (qr) {
      this.currentQR = qr
      this.status = 'qr_ready'
      logger.info('[BaileysConnection] QR code ready for scanning')
    }

    // Handle connection state changes
    if (connection === 'open') {
      this.currentQR = null
      this.status = 'connected'
      this.lastError = null
      this.reconnectAttempts = 0
      logger.info('[BaileysConnection] Connected to WhatsApp')
    }

    if (connection === 'close') {
      this.currentQR = null
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      this.status = 'disconnected'
      this.lastError = lastDisconnect?.error?.message || 'Connection closed'

      logger.warn('[BaileysConnection] Connection closed', {
        statusCode,
        shouldReconnect,
        error: this.lastError,
      })

      if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
        
        logger.info('[BaileysConnection] Scheduling reconnection', {
          attempt: this.reconnectAttempts,
          delayMs: delay,
        })
        
        setTimeout(() => {
          void this.connect()
        }, delay)
      } else if (statusCode === DisconnectReason.loggedOut) {
        logger.error('[BaileysConnection] Logged out. Need to re-scan QR code.')
      }
    }
  }

  /**
   * Gets the current connection state.
   * 
   * @returns Current connection state including status and QR code availability
   * 
   * @example
   * ```typescript
   * const state = connection.getState()
   * console.log(state.status) // 'connected', 'qr_ready', etc.
   * ```
   */
  getState(): BaileysConnectionState {
    return {
      status: this.status,
      qrCode: this.currentQR,
      lastError: this.lastError,
    }
  }

  /**
   * Gets the current QR code as a Data URL for display.
   * 
   * @returns Promise resolving to QR code as data URL, or null if not available
   * 
   * @example
   * ```typescript
   * const qrDataUrl = await connection.getQRCodeDataURL()
   * if (qrDataUrl) {
   *   // Use in <img src={qrDataUrl} />
   * }
   * ```
   */
  async getQRCodeDataURL(): Promise<string | null> {
    if (!this.currentQR) {
      return null
    }

    try {
      const dataUrl = await qrcode.toDataURL(this.currentQR, {
        width: 300,
        margin: 2,
      })
      return dataUrl
    } catch (error) {
      logger.error('[BaileysConnection] Failed to generate QR code image', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Gets the current QR code as a terminal string for CLI display.
   * 
   * @returns Promise resolving to QR code as ASCII string, or null if not available
   */
  async getQRCodeTerminal(): Promise<string | null> {
    if (!this.currentQR) {
      return null
    }

    try {
      return await qrcode.toString(this.currentQR, { type: 'terminal', small: true })
    } catch (error) {
      logger.error('[BaileysConnection] Failed to generate terminal QR code', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Checks if the connection is ready to send/receive messages.
   * 
   * @returns true if connected
   */
  isConnected(): boolean {
    return this.status === 'connected'
  }

  /**
   * Checks if a QR code is available for scanning.
   * 
   * @returns true if QR code is ready
   */
  hasQRCode(): boolean {
    return this.status === 'qr_ready' && this.currentQR !== null
  }

  /**
   * Gets the underlying Baileys socket (for advanced usage).
   * 
   * @returns The WASocket instance or null if not connected
   */
  getSocket(): WASocket | null {
    return this.socket
  }

  /**
   * Disconnects from WhatsApp.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.end(undefined)
      this.socket = null
    }
    this.status = 'disconnected'
    this.currentQR = null
    logger.info('[BaileysConnection] Disconnected')
  }
}

// Singleton instance for global access
let connectionInstance: BaileysConnectionService | null = null

/**
 * Gets or creates the global Baileys connection service instance.
 * 
 * @param config - Configuration options (only used on first call)
 * @returns The singleton BaileysConnectionService instance
 */
export function getBaileysConnection(config?: BaileysConnectionConfig): BaileysConnectionService {
  if (!connectionInstance) {
    connectionInstance = new BaileysConnectionService(config)
  }
  return connectionInstance
}
