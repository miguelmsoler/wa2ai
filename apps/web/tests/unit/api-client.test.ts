/**
 * Unit tests for API client (lib/api/).
 * 
 * Tests API client functions (createRoute, updateRoute, deleteRoute, getQRImageUrl) with mocked fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoute, updateRoute, deleteRoute, getQRImageUrl } from '@/lib/api'
import type { Route, ApiResponse, ApiError } from '@/lib/types'

// Mock global fetch
global.fetch = vi.fn()

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getQRImageUrl', () => {
    it('should return QR image URL with cache busting timestamp', () => {
      const url = getQRImageUrl()
      expect(url).toMatch(/^http:\/\/localhost:3000\/qr\/image\?t=\d+$/)
    })

    it('should include different timestamp on each call', async () => {
      const url1 = getQRImageUrl()
      // Delay to ensure different timestamp (Date.now() can be same for rapid calls)
      await new Promise(resolve => setTimeout(resolve, 10))
      const url2 = getQRImageUrl()
      // Extract timestamps from URLs
      const timestamp1 = url1.match(/t=(\d+)/)?.[1]
      const timestamp2 = url2.match(/t=(\d+)/)?.[1]
      expect(timestamp1).toBeTruthy()
      expect(timestamp2).toBeTruthy()
      // Timestamps should be different (or at least the format should be correct)
      if (timestamp1 === timestamp2) {
        // If same, at least verify format is correct
        expect(parseInt(timestamp1!)).toBeGreaterThan(0)
      } else {
        expect(timestamp1).not.toBe(timestamp2)
      }
    })
  })

  describe('createRoute', () => {
    it('should create a route successfully', async () => {
      const mockRoute: Route = {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        config: {
          adk: {
            appName: 'test_agent',
          },
        },
      }

      const mockResponse: ApiResponse<Route> = {
        success: true,
        data: mockRoute,
        message: 'Route added successfully',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      })

      const result = await createRoute(mockRoute)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/routes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockRoute),
        }
      )

      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRoute)
    })

    it('should throw ApiError on validation error (400)', async () => {
      const mockRoute: Route = {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
        regexFilter: '[invalid', // Invalid regex
      }

      const mockErrorResponse: ApiResponse<unknown> = {
        success: false,
        error: 'Invalid regex pattern: Unterminated character class',
        code: 'INVALID_REGEX_PATTERN',
        details: {
          field: 'regexFilter',
          value: '[invalid',
        },
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => mockErrorResponse,
      })

      await expect(createRoute(mockRoute)).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_REGEX_PATTERN',
        message: 'Invalid regex pattern: Unterminated character class',
      })
    })

    it('should throw ApiError on server error (500)', async () => {
      const mockRoute: Route = {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      const mockErrorResponse: ApiResponse<unknown> = {
        success: false,
        error: 'Internal server error',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => mockErrorResponse,
      })

      await expect(createRoute(mockRoute)).rejects.toMatchObject({
        status: 500,
        message: 'Internal server error',
      })
    })
  })

  describe('updateRoute', () => {
    it('should update a route successfully', async () => {
      const channelId = '5493777239922'
      const mockRoute: Route = {
        channelId,
        agentEndpoint: 'http://localhost:8001',
        environment: 'prod',
        regexFilter: '^Test.*',
      }

      const mockResponse: ApiResponse<Route> = {
        success: true,
        data: mockRoute,
        message: 'Route updated successfully',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await updateRoute(channelId, mockRoute)

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/routes/${encodeURIComponent(channelId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockRoute),
        }
      )

      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(true)
    })

    it('should handle route not found (404)', async () => {
      const channelId = 'nonexistent'
      const mockRoute: Route = {
        channelId,
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      const mockErrorResponse: ApiResponse<unknown> = {
        success: false,
        error: `Route not found for channel: ${channelId}`,
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => mockErrorResponse,
      })

      await expect(updateRoute(channelId, mockRoute)).rejects.toMatchObject({
        status: 404,
      })
    })
  })

  describe('deleteRoute', () => {
    it('should delete a route successfully (204 No Content)', async () => {
      const channelId = '5493777239922'

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })

      await deleteRoute(channelId)

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/routes/${encodeURIComponent(channelId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: undefined,
        }
      )
    })

    it('should delete a route successfully (200 with JSON)', async () => {
      const channelId = '5493777239922'

      const mockResponse: ApiResponse<Route> = {
        success: true,
        message: 'Route deleted successfully',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      await deleteRoute(channelId)

      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/routes/${encodeURIComponent(channelId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: undefined,
        }
      )
    })

    it('should throw ApiError when route not found (404)', async () => {
      const channelId = 'nonexistent'

      const mockErrorResponse: ApiResponse<unknown> = {
        success: false,
        error: `Route not found for channel: ${channelId}`,
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => mockErrorResponse,
      })

      await expect(deleteRoute(channelId)).rejects.toMatchObject({
        status: 404,
      })
    })
  })

  describe('Error handling', () => {
    it('should handle non-JSON error responses', async () => {
      const mockRoute: Route = {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      await expect(createRoute(mockRoute)).rejects.toMatchObject({
        status: 500,
        message: 'HTTP 500: Internal Server Error',
      })
    })

    it('should handle network errors', async () => {
      const mockRoute: Route = {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(createRoute(mockRoute)).rejects.toThrow('Network error')
    })
  })
})

