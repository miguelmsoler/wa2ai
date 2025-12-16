/**
 * Integration tests for API client.
 * 
 * Tests API client with mocked HTTP responses to verify end-to-end behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import React from 'react'
import { useRoutes } from '@/lib/hooks/use-routes'
import { useRoute } from '@/lib/hooks/use-route'
import { useConnectionStatus } from '@/lib/hooks/use-connection-status'
import { createRoute, updateRoute, deleteRoute } from '@/lib/api'
import type { Route, ConnectionState, ApiResponse } from '@/lib/types'

// Mock global fetch
global.fetch = vi.fn()

/**
 * Wrapper component for SWR hooks testing.
 */
const SWRWrapper = ({ children }: { children: React.ReactNode }) => {
  const swrConfig: any = {
    provider: () => new Map(),
    dedupingInterval: 0,
  }
  return React.createElement(SWRConfig, { value: swrConfig }, children)
}

describe('API Client Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useRoutes hook', () => {
    it('should fetch and return routes list', async () => {
      const mockRoutes: Route[] = [
        {
          channelId: '5493777239922',
          agentEndpoint: 'http://localhost:8000',
          environment: 'lab',
          config: {
            adk: {
              appName: 'test_agent',
            },
          },
        },
        {
          channelId: '*',
          agentEndpoint: 'http://localhost:8001',
          environment: 'prod',
          regexFilter: '^Test.*',
        },
      ]

      const mockResponse: ApiResponse<Route[]> = {
        success: true,
        data: mockRoutes,
        count: 2,
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useRoutes(), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.routes).toEqual(mockRoutes)
      expect(result.current.isError).toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/routes'
      )
    })

    it('should handle empty routes list', async () => {
      const mockResponse: ApiResponse<Route[]> = {
        success: true,
        data: [],
        count: 0,
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useRoutes(), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.routes).toEqual([])
    })

    it('should handle API error', async () => {
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

      const { result } = renderHook(() => useRoutes(), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isError).toBeDefined()
      })

      expect(result.current.isError).toBeDefined()
      expect(result.current.routes).toEqual([])
    })
  })

  describe('useRoute hook', () => {
    it('should fetch a single route by channelId', async () => {
      const channelId = '5493777239922'
      const mockRoute: Route = {
        channelId,
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
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const { result } = renderHook(() => useRoute(channelId), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.route).toEqual(mockRoute)
      expect(result.current.isError).toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/routes/${encodeURIComponent(channelId)}`
      )
    })

    it('should not fetch when channelId is null', () => {
      const { result } = renderHook(() => useRoute(null), {
        wrapper: SWRWrapper,
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.route).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle route not found (404)', async () => {
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

      const { result } = renderHook(() => useRoute(channelId), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isError).toBeDefined()
      })

      expect(result.current.isError).toBeDefined()
      expect(result.current.route).toBeNull()
    })
  })

  describe('useConnectionStatus hook', () => {
    it('should fetch and return connection status', async () => {
      const mockStatus: ConnectionState = {
        status: 'connected',
        connected: true,
        qrAvailable: false,
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStatus,
      })

      const { result } = renderHook(() => useConnectionStatus(), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.status).toBe('connected')
      expect(result.current.connected).toBe(true)
      expect(result.current.qrAvailable).toBe(false)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/qr/status'
      )
    })

    it('should handle QR ready state', async () => {
      const mockStatus: ConnectionState = {
        status: 'qr_ready',
        connected: false,
        qrAvailable: true,
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStatus,
      })

      const { result } = renderHook(() => useConnectionStatus(), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.status).toBe('qr_ready')
      expect(result.current.qrAvailable).toBe(true)
    })

    it('should handle connection error', async () => {
      const mockStatus: ConnectionState = {
        status: 'disconnected',
        connected: false,
        qrAvailable: false,
        error: 'Connection timeout',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStatus,
      })

      const { result } = renderHook(() => useConnectionStatus(), {
        wrapper: SWRWrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Connection timeout')
    })
  })

  describe('Mutation functions integration', () => {
    it('should create, update, and delete route in sequence', async () => {
      const mockRoute: Route = {
        channelId: '5493777239922',
        agentEndpoint: 'http://localhost:8000',
        environment: 'lab',
      }

      // Create route
      const createResponse: ApiResponse<Route> = {
        success: true,
        data: mockRoute,
        message: 'Route added successfully',
      }

      ;(global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => createResponse,
        })
        // Update route
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            ...createResponse,
            data: { ...mockRoute, environment: 'prod' },
            message: 'Route updated successfully',
          }),
        })
        // Delete route
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
          json: async () => ({}),
        })

      // Create
      const createResult = await createRoute(mockRoute)
      expect(createResult.success).toBe(true)
      expect(createResult.data).toEqual(mockRoute)

      // Update
      const updateResult = await updateRoute(mockRoute.channelId, {
        ...mockRoute,
        environment: 'prod',
      })
      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.environment).toBe('prod')

      // Delete
      await deleteRoute(mockRoute.channelId)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })
})

