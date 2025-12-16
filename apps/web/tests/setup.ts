/**
 * Test setup file for Vitest.
 * 
 * Configures testing environment with necessary mocks and utilities.
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_QR_REFRESH_INTERVAL = '3000'
process.env.NEXT_PUBLIC_STATUS_REFRESH_INTERVAL = '5000'
process.env.NEXT_PUBLIC_ROUTES_REFRESH_INTERVAL = '10000'

