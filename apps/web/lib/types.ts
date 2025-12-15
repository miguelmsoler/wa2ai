/**
 * TypeScript types for API responses and domain models.
 * 
 * These types must match the backend models in `router/src/core/models.ts`
 * and the API response formats from the backend controllers.
 */

/**
 * Environment type for routes (lab or production).
 */
export type Environment = 'lab' | 'prod'

/**
 * Connection status for WhatsApp connection.
 */
export type ConnectionStatus = 
  | 'connected' 
  | 'connecting' 
  | 'qr_ready' 
  | 'disconnected'

/**
 * Route configuration interface.
 * 
 * Matches the Route model from the backend (`router/src/core/models.ts`).
 */
export interface Route {
  /** Channel identifier that triggers this route (or "*" for wildcard) */
  channelId: string
  /** Agent endpoint URL */
  agentEndpoint: string
  /** Environment (lab or prod) */
  environment: Environment
  /** Optional regular expression to filter messages by text content */
  regexFilter?: string
  /** Additional route configuration */
  config?: {
    /** ADK (Agent Development Kit) configuration */
    adk?: {
      /** ADK agent directory name (e.g., my_sample_agent) */
      appName: string
      /** ADK server base URL (optional, defaults to agentEndpoint) */
      baseUrl?: string
    }
    /** Additional configuration fields */
    [key: string]: unknown
  }
}

/**
 * Connection state for WhatsApp connection.
 * 
 * Matches the response format from `GET /qr/status`.
 */
export interface ConnectionState {
  /** Current connection status */
  status: ConnectionStatus
  /** Whether WhatsApp is currently connected */
  connected: boolean
  /** Whether QR code is available for scanning */
  qrAvailable: boolean
  /** Error message (if any) */
  error?: string
}

/**
 * Generic API response wrapper.
 * 
 * Matches the response format from backend API endpoints.
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean
  /** Response data (present if success is true) */
  data?: T
  /** Error message (present if success is false) */
  error?: string
  /** Error code (e.g., 'INVALID_REGEX_PATTERN') */
  code?: string
  /** Additional error details */
  details?: unknown
  /** Success message (present in some responses) */
  message?: string
  /** Count of items (present in list responses) */
  count?: number
}

/**
 * API error with structured information.
 */
export interface ApiError extends Error {
  /** HTTP status code */
  status?: number
  /** Error code from API */
  code?: string
  /** Additional error details */
  details?: unknown
  /** API response info */
  info?: ApiResponse<unknown>
}
