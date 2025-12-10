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
  type proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as qrcode from 'qrcode'
import { rm } from 'fs/promises'
import { logger, isDebugMode } from '../core/logger.js'
import type { IncomingMessage } from '../core/models.js'
import type { MessageFilterOptions, MessageHandlerCallback } from '../core/message-handler.js'
import { DEFAULT_MESSAGE_FILTER_OPTIONS } from '../core/message-handler.js'
import { processBaileysMessages } from './baileys-message-adapter.js'

/**
 * Connection status for the Baileys service.
 */
export type BaileysConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'qr_ready'
  | 'connected'
  | 'reconnecting'

/**
 * Gets human-readable description for a disconnect reason code.
 * 
 * @param statusCode - The disconnect status code from Baileys
 * @returns Human-readable description of the disconnect reason
 */
export function getDisconnectReasonDescription(statusCode: number | undefined): string {
  if (statusCode === undefined) {
    return 'Unknown reason'
  }

  // Note: Some DisconnectReason values may have the same numeric code
  // We check specific values to provide accurate descriptions
  switch (statusCode) {
    case DisconnectReason.badSession:
      return 'Bad session - credentials corrupted'
    case DisconnectReason.connectionClosed:
      return 'Connection closed by server'
    case DisconnectReason.connectionLost:
      return 'Connection lost - network issue'
    case DisconnectReason.connectionReplaced:
      return 'Connection replaced - logged in elsewhere'
    case DisconnectReason.loggedOut:
      return 'Logged out - need to re-scan QR'
    case DisconnectReason.restartRequired:
      return 'Restart required'
    case DisconnectReason.timedOut:
      return 'Connection timed out'
    default:
      return `Unknown reason (code: ${statusCode})`
  }
}

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
  /** Last disconnect reason code (if any) */
  lastDisconnectReason: number | null
  /** Human-readable disconnect reason description */
  lastDisconnectDescription: string | null
  /** Current reconnection attempt number (0 if not reconnecting) */
  reconnectAttempt: number
  /** Whether credentials need to be cleared */
  needsCredentialsClear: boolean
}

/**
 * Callback type for connection state changes.
 */
export type ConnectionStateCallback = (state: BaileysConnectionState) => void

/**
 * Configuration for Baileys connection service.
 */
export interface BaileysConnectionConfig {
  /** Directory to store authentication state */
  authDir?: string
  /** Whether to print QR in terminal (for debugging) */
  printQRInTerminal?: boolean
  /** Maximum reconnection attempts before giving up */
  maxReconnectAttempts?: number
  /** Callback for state changes */
  onStateChange?: ConnectionStateCallback
  /** Callback for incoming messages */
  onMessage?: MessageHandlerCallback
  /** Message filter options */
  messageFilter?: MessageFilterOptions
}

/**
 * Service that manages the Baileys WhatsApp connection.
 * 
 * This service handles:
 * - WebSocket connection to WhatsApp
 * - QR code generation and storage
 * - Connection state management
 * - Automatic reconnection logic with exponential backoff
 * - Disconnect reason handling
 * - Credentials management
 * 
 * @example
 * ```typescript
 * const connection = new BaileysConnectionService({
 *   authDir: './auth',
 *   onStateChange: (state) => console.log('State changed:', state.status)
 * })
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
  private lastDisconnectReason: number | null = null
  private needsCredentialsClear = false
  private config: Required<Omit<BaileysConnectionConfig, 'onStateChange' | 'onMessage'>> & { 
    onStateChange?: ConnectionStateCallback
    onMessage?: MessageHandlerCallback
  }
  private reconnectAttempts = 0
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
  private messageHandlers: MessageHandlerCallback[] = []

  constructor(config: BaileysConnectionConfig = {}) {
    this.config = {
      authDir: config.authDir || './auth_info_baileys',
      printQRInTerminal: config.printQRInTerminal ?? isDebugMode(),
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      messageFilter: config.messageFilter ?? DEFAULT_MESSAGE_FILTER_OPTIONS,
      onStateChange: config.onStateChange,
      onMessage: config.onMessage,
    }
    
    // Register initial message handler if provided
    if (config.onMessage) {
      this.messageHandlers.push(config.onMessage)
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

      // Handle incoming messages
      this.socket.ev.on('messages.upsert', (event) => {
        void this.handleMessagesUpsert(event)
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
   * Notifies state change to callback if configured.
   */
  private notifyStateChange(): void {
    if (this.config.onStateChange) {
      if (isDebugMode()) {
        logger.debug('[BaileysConnection] Notifying state change', {
          status: this.status,
          hasCallback: true,
        })
      }
      this.config.onStateChange(this.getState())
    }
  }

  /**
   * Handles incoming messages from Baileys.
   * 
   * This method processes `messages.upsert` events which contain
   * new messages or message updates.
   * 
   * @param event - The messages upsert event from Baileys
   */
  private async handleMessagesUpsert(event: { 
    type: 'notify' | 'append' | 'set'
    messages: proto.IWebMessageInfo[] 
  }): Promise<void> {
    const { type, messages } = event

    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Messages upsert event', {
        type,
        messageCount: messages.length,
      })
    }

    // Only process new messages (notify), not history sync (append/set)
    if (type !== 'notify') {
      if (isDebugMode()) {
        logger.debug('[BaileysConnection] Skipping non-notify messages', { type })
      }
      return
    }

    // Process and normalize messages
    const normalizedMessages = processBaileysMessages(messages, this.config.messageFilter)

    if (normalizedMessages.length === 0) {
      if (isDebugMode()) {
        logger.debug('[BaileysConnection] No messages to process after filtering')
      }
      return
    }

    logger.info('[BaileysConnection] Processing incoming messages', {
      count: normalizedMessages.length,
    })

    // Call all registered message handlers
    for (const message of normalizedMessages) {
      await this.dispatchMessage(message)
    }
  }

  /**
   * Dispatches a message to all registered handlers.
   * 
   * @param message - The normalized incoming message
   */
  private async dispatchMessage(message: IncomingMessage): Promise<void> {
    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Dispatching message', {
        id: message.id,
        from: message.from,
        channelId: message.channelId,
        handlerCount: this.messageHandlers.length,
      })
    }

    if (this.messageHandlers.length === 0) {
      logger.warn('[BaileysConnection] No message handlers registered')
      return
    }

    for (const handler of this.messageHandlers) {
      try {
        const result = await handler(message)
        
        if (isDebugMode()) {
          logger.debug('[BaileysConnection] Handler result', {
            messageId: message.id,
            success: result.success,
            hasResponse: !!result.response,
          })
        }

        // Response sending is handled by the handler (e.g., MessageRouter)
        // BaileysConnection only dispatches messages to handlers
      } catch (error) {
        logger.error('[BaileysConnection] Message handler error', {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  /**
   * Sends a text message via WhatsApp.
   * 
   * @param to - The recipient JID
   * @param text - The message text
   * @returns Promise that resolves when the message is sent
   */
  async sendTextMessage(to: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Not connected to WhatsApp')
    }

    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Sending text message', {
        to,
        textLength: text.length,
      })
    }

    try {
      await this.socket.sendMessage(to, { text })
      logger.info('[BaileysConnection] Message sent', { to })
    } catch (error) {
      logger.error('[BaileysConnection] Failed to send message', {
        to,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Registers a message handler callback.
   * 
   * Multiple handlers can be registered and they will be called
   * in order for each incoming message.
   * 
   * @param handler - The message handler callback
   * @returns Function to unregister the handler
   * 
   * @example
   * ```typescript
   * const unregister = connection.onMessage(async (message) => {
   *   console.log('Received:', message.text)
   *   return { success: true, response: 'Got it!' }
   * })
   * 
   * // Later, to unregister:
   * unregister()
   * ```
   */
  onMessage(handler: MessageHandlerCallback): () => void {
    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Registering message handler', {
        currentHandlerCount: this.messageHandlers.length,
      })
    }

    this.messageHandlers.push(handler)

    // Return unregister function
    return () => {
      const index = this.messageHandlers.indexOf(handler)
      if (index !== -1) {
        this.messageHandlers.splice(index, 1)
        if (isDebugMode()) {
          logger.debug('[BaileysConnection] Unregistered message handler', {
            remainingHandlers: this.messageHandlers.length,
          })
        }
      }
    }
  }

  /**
   * Gets the number of registered message handlers.
   * 
   * @returns The count of registered handlers
   */
  getMessageHandlerCount(): number {
    return this.messageHandlers.length
  }

  /**
   * Handles connection state updates from Baileys.
   * 
   * This method processes all connection events including:
   * - QR code generation
   * - Connection open/close
   * - Various disconnect reasons with appropriate handling
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
      this.notifyStateChange()
    }

    // Handle connection open
    if (connection === 'open') {
      this.currentQR = null
      this.status = 'connected'
      this.lastError = null
      this.lastDisconnectReason = null
      this.needsCredentialsClear = false
      this.reconnectAttempts = 0
      this.cancelReconnect()
      logger.info('[BaileysConnection] Connected to WhatsApp')
      this.notifyStateChange()
    }

    // Handle connection close
    if (connection === 'close') {
      this.handleDisconnect(lastDisconnect)
    }
  }

  /**
   * Handles disconnect events with appropriate actions based on reason.
   * 
   * @param lastDisconnect - Disconnect information from Baileys
   */
  private handleDisconnect(lastDisconnect: { error: Error | undefined; date: Date } | undefined): void {
    this.currentQR = null
    this.socket = null
    
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
    this.lastDisconnectReason = statusCode ?? null
    this.lastError = lastDisconnect?.error?.message || 'Connection closed'
    
    const reasonDescription = getDisconnectReasonDescription(statusCode)

    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Disconnect details', {
        statusCode,
        reasonDescription,
        errorMessage: this.lastError,
      })
    }

    // Determine action based on disconnect reason
    const action = this.determineDisconnectAction(statusCode)

    logger.warn('[BaileysConnection] Connection closed', {
      statusCode,
      reason: reasonDescription,
      action: action.action,
      error: this.lastError,
    })

    // Execute determined action
    if (action.clearCredentials) {
      this.needsCredentialsClear = true
      logger.warn('[BaileysConnection] Credentials should be cleared due to: ' + reasonDescription)
    }

    if (action.shouldReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.status = 'reconnecting'
      this.scheduleReconnect()
    } else {
      this.status = 'disconnected'
      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        logger.error('[BaileysConnection] Max reconnection attempts reached', {
          attempts: this.reconnectAttempts,
          maxAttempts: this.config.maxReconnectAttempts,
        })
      }
    }

    this.notifyStateChange()
  }

  /**
   * Determines the appropriate action based on disconnect reason.
   * 
   * @param statusCode - The disconnect status code
   * @returns Action to take (reconnect, clear credentials, etc.)
   */
  private determineDisconnectAction(statusCode: number | undefined): {
    shouldReconnect: boolean
    clearCredentials: boolean
    action: string
  } {
    let result: { shouldReconnect: boolean; clearCredentials: boolean; action: string }

    if (!statusCode) {
      result = { shouldReconnect: true, clearCredentials: false, action: 'reconnect' }
    } else {
      switch (statusCode) {
        case DisconnectReason.loggedOut:
          // User logged out - need to re-authenticate
          result = { shouldReconnect: false, clearCredentials: true, action: 'require_qr_scan' }
          break

        case DisconnectReason.badSession:
          // Session corrupted - clear and restart
          result = { shouldReconnect: true, clearCredentials: true, action: 'clear_and_reconnect' }
          break

        case DisconnectReason.connectionReplaced:
          // Logged in elsewhere - don't auto-reconnect to avoid conflict
          result = { shouldReconnect: false, clearCredentials: false, action: 'connection_replaced' }
          break

        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.timedOut:
          // Network issues - reconnect
          result = { shouldReconnect: true, clearCredentials: false, action: 'reconnect' }
          break

        case DisconnectReason.restartRequired:
          // Restart required by WhatsApp
          result = { shouldReconnect: true, clearCredentials: false, action: 'restart_required' }
          break

        default:
          // Unknown reason - try to reconnect
          result = { shouldReconnect: true, clearCredentials: false, action: 'reconnect_unknown' }
      }
    }

    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Determined disconnect action', {
        statusCode,
        ...result,
      })
    }

    return result
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++
    // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    
    logger.info('[BaileysConnection] Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delayMs: delay,
    })
    
    this.reconnectTimeoutId = setTimeout(() => {
      // Clear credentials if needed before reconnecting
      if (this.needsCredentialsClear) {
        void this.clearCredentials().then(() => {
          this.needsCredentialsClear = false
          void this.connect()
        })
      } else {
        void this.connect()
      }
    }, delay)
  }

  /**
   * Cancels any pending reconnection attempt.
   */
  private cancelReconnect(): void {
    if (this.reconnectTimeoutId) {
      if (isDebugMode()) {
        logger.debug('[BaileysConnection] Cancelling pending reconnection')
      }
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
  }

  /**
   * Gets the current connection state.
   * 
   * @returns Current connection state including status, QR code, errors, and disconnect info
   * 
   * @example
   * ```typescript
   * const state = connection.getState()
   * console.log(state.status) // 'connected', 'qr_ready', 'reconnecting', etc.
   * if (state.needsCredentialsClear) {
   *   await connection.clearCredentials()
   * }
   * ```
   */
  getState(): BaileysConnectionState {
    return {
      status: this.status,
      qrCode: this.currentQR,
      lastError: this.lastError,
      lastDisconnectReason: this.lastDisconnectReason,
      lastDisconnectDescription: this.lastDisconnectReason !== null
        ? getDisconnectReasonDescription(this.lastDisconnectReason)
        : null,
      reconnectAttempt: this.reconnectAttempts,
      needsCredentialsClear: this.needsCredentialsClear,
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
    if (isDebugMode()) {
      logger.debug('[BaileysConnection] getQRCodeDataURL called', {
        hasQR: !!this.currentQR,
      })
    }

    if (!this.currentQR) {
      return null
    }

    try {
      const dataUrl = await qrcode.toDataURL(this.currentQR, {
        width: 300,
        margin: 2,
      })
      
      if (isDebugMode()) {
        logger.debug('[BaileysConnection] QR code data URL generated successfully')
      }
      
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
    if (isDebugMode()) {
      logger.debug('[BaileysConnection] getQRCodeTerminal called', {
        hasQR: !!this.currentQR,
      })
    }

    if (!this.currentQR) {
      return null
    }

    try {
      const result = await qrcode.toString(this.currentQR, { type: 'terminal', small: true })
      
      if (isDebugMode()) {
        logger.debug('[BaileysConnection] Terminal QR code generated successfully')
      }
      
      return result
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
   * Performs a health check on the connection.
   * 
   * Verifies that the connection is active and responsive.
   * 
   * @returns Object with health status and details
   * 
   * @example
   * ```typescript
   * const health = connection.checkHealth()
   * if (!health.healthy) {
   *   console.error('Connection unhealthy:', health.reason)
   * }
   * ```
   */
  checkHealth(): { healthy: boolean; status: BaileysConnectionStatus; reason?: string } {
    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Health check', {
        status: this.status,
        hasSocket: !!this.socket,
        reconnectAttempts: this.reconnectAttempts,
      })
    }

    if (this.status === 'connected' && this.socket) {
      return { healthy: true, status: this.status }
    }

    if (this.status === 'reconnecting') {
      return { 
        healthy: false, 
        status: this.status, 
        reason: `Reconnecting (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})` 
      }
    }

    if (this.status === 'qr_ready') {
      return { healthy: false, status: this.status, reason: 'Waiting for QR code scan' }
    }

    if (this.status === 'connecting') {
      return { healthy: false, status: this.status, reason: 'Connection in progress' }
    }

    return { 
      healthy: false, 
      status: this.status, 
      reason: this.lastError || 'Not connected' 
    }
  }

  /**
   * Clears stored credentials and resets authentication state.
   * 
   * This is necessary when:
   * - BadSession error occurs
   * - User explicitly wants to log out
   * - Credentials are corrupted
   * 
   * After clearing, a new QR code will be required on next connect.
   * 
   * @returns Promise that resolves when credentials are cleared
   * 
   * @example
   * ```typescript
   * await connection.clearCredentials()
   * await connection.connect() // Will show new QR code
   * ```
   */
  async clearCredentials(): Promise<void> {
    logger.info('[BaileysConnection] Clearing credentials', {
      authDir: this.config.authDir,
    })

    // Disconnect first if connected
    if (this.socket) {
      this.socket.end(undefined)
      this.socket = null
    }

    try {
      await rm(this.config.authDir, { recursive: true, force: true })
      this.needsCredentialsClear = false
      this.lastDisconnectReason = null
      this.lastError = null
      logger.info('[BaileysConnection] Credentials cleared successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('[BaileysConnection] Failed to clear credentials', {
        error: errorMsg,
        authDir: this.config.authDir,
      })
      throw error
    }
  }

  /**
   * Disconnects from WhatsApp and optionally clears credentials.
   * 
   * @param clearCreds - If true, also clears stored credentials
   */
  async disconnect(clearCreds = false): Promise<void> {
    this.cancelReconnect()

    if (this.socket) {
      this.socket.end(undefined)
      this.socket = null
    }

    this.status = 'disconnected'
    this.currentQR = null
    this.reconnectAttempts = 0

    if (clearCreds) {
      await this.clearCredentials()
    }

    logger.info('[BaileysConnection] Disconnected', { clearedCredentials: clearCreds })
    this.notifyStateChange()
  }

  /**
   * Resets reconnection counter and clears error state.
   * 
   * Useful when manually triggering a fresh connection attempt.
   */
  resetReconnectCounter(): void {
    this.reconnectAttempts = 0
    this.lastError = null
    this.lastDisconnectReason = null
    
    if (isDebugMode()) {
      logger.debug('[BaileysConnection] Reconnect counter reset')
    }
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
