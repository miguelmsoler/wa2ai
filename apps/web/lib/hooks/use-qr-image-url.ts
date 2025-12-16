/**
 * Hook for getting QR code image URL.
 * 
 * This hook provides access to the QR code image URL with cache busting.
 * Following Clean Architecture, this is part of the Application Layer.
 * 
 * @module lib/hooks/use-qr-image-url
 */

'use client'

import { getQRImageUrl } from '../api/connection'

/**
 * Hook that returns the QR code image URL with cache busting.
 * 
 * The URL includes a timestamp to ensure fresh QR code images are fetched.
 * 
 * @returns QR code image URL string
 * 
 * @example
 * ```tsx
 * const qrUrl = useQRImageUrl()
 * <img src={qrUrl} alt="QR Code" />
 * ```
 */
export function useQRImageUrl(): string {
  // getQRImageUrl() already includes cache busting with Date.now()
  // We call it directly since it's a pure function that generates a new URL each time
  return getQRImageUrl()
}
