/**
 * Connection API client.
 * 
 * This module provides functions for interacting with the connection/QR code API endpoints.
 * Following Clean Architecture, this is part of the Infrastructure Layer.
 * 
 * @module lib/api/connection
 */

import { getApiUrl } from './client'

/**
 * Gets the URL for the QR code image with cache busting.
 * 
 * @returns URL string for the QR code image endpoint
 * 
 * @example
 * ```tsx
 * const qrUrl = getQRImageUrl()
 * <img src={qrUrl} alt="QR Code" />
 * ```
 */
export function getQRImageUrl(): string {
  return `${getApiUrl()}/qr/image?t=${Date.now()}`
}
