/**
 * Domain models for wa2ai router.
 * 
 * These models represent the core business entities and are independent
 * of any external framework or infrastructure.
 */

/**
 * Represents an incoming message from WhatsApp.
 */
export interface IncomingMessage {
  /** Unique identifier for the message */
  id: string
  /** Sender identifier (phone number or contact ID) */
  from: string
  /** Channel/group identifier */
  channelId: string
  /** Message text content */
  text: string
  /** Timestamp when the message was received */
  timestamp: Date
  /** Additional metadata (optional) */
  metadata?: Record<string, unknown>
}

/**
 * Represents an outgoing message to be sent via WhatsApp.
 */
export interface OutgoingMessage {
  /** Target recipient identifier */
  to: string
  /** Channel/group identifier */
  channelId: string
  /** Message text content */
  text: string
  /** Additional metadata (optional) */
  metadata?: Record<string, unknown>
}

/**
 * Represents a routing rule that maps a channel to an agent endpoint.
 */
export interface Route {
  /** Channel identifier that triggers this route */
  channelId: string
  /** Agent endpoint URL */
  agentEndpoint: string
  /** Environment (lab or prod) */
  environment: 'lab' | 'prod'
  /** Optional regular expression to filter messages by text content */
  regexFilter?: string
  /** Additional route configuration */
  config?: Record<string, unknown>
}

