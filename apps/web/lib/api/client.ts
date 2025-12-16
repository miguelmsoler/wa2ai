/**
 * Base API client for HTTP requests.
 * 
 * This module provides the infrastructure layer for communicating with the backend API.
 * Following Clean Architecture, this is the Infrastructure Layer that handles
 * external service communication and data transformation.
 * 
 * @module lib/api/client
 */

import { logger, isDebugMode } from '../utils/logger'
import type { ApiResponse, ApiError } from '../types'

/**
 * Base API URL from environment variable.
 * Defaults to http://localhost:3000 if not set.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Generic fetcher function for HTTP GET requests.
 * 
 * Handles HTTP requests and error parsing.
 * 
 * @param url - API endpoint path (relative to API_URL)
 * @returns Promise with parsed JSON response
 * @throws {ApiError} If the request fails
 */
export async function fetcher<T>(url: string): Promise<T> {
  if (isDebugMode()) {
    logger.debug('[ApiClient] Fetching data', { url: `${API_URL}${url}` })
  }

  const response = await fetch(`${API_URL}${url}`)
  
  if (!response.ok) {
    const error: ApiError = new Error('API request failed') as ApiError
    error.status = response.status
    
    try {
      const errorData = await response.json() as ApiResponse<unknown>
      error.info = errorData
      error.message = errorData.error || `HTTP ${response.status}: ${response.statusText}`
      error.code = errorData.code
      error.details = errorData.details
    } catch {
      // If response is not JSON, use status text
      error.message = `HTTP ${response.status}: ${response.statusText}`
    }
    
    logger.error('[ApiClient] API request failed', {
      url: `${API_URL}${url}`,
      status: response.status,
      message: error.message,
      code: error.code,
    })
    
    throw error
  }
  
  if (isDebugMode()) {
    logger.debug('[ApiClient] Fetch successful', { url: `${API_URL}${url}`, status: response.status })
  }
  
  return response.json() as Promise<T>
}

/**
 * Generic mutator function for POST/PUT/DELETE requests.
 * 
 * @param url - API endpoint path
 * @param method - HTTP method (POST, PUT, DELETE)
 * @param body - Request body (optional)
 * @returns Promise with parsed JSON response
 * @throws {ApiError} If the request fails
 */
export async function mutator<T = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<ApiResponse<T>> {
  if (isDebugMode()) {
    logger.debug('[ApiClient] Mutating data', {
      method,
      url: `${API_URL}${url}`,
      hasBody: !!body,
    })
  }

  const response = await fetch(`${API_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  
  if (!response.ok) {
    const error: ApiError = new Error('API request failed') as ApiError
    error.status = response.status
    
    try {
      const errorData = await response.json() as ApiResponse<unknown>
      error.info = errorData
      error.message = errorData.error || `HTTP ${response.status}: ${response.statusText}`
      error.code = errorData.code
      error.details = errorData.details
    } catch {
      error.message = `HTTP ${response.status}: ${response.statusText}`
    }
    
    logger.error('[ApiClient] Mutation failed', {
      method,
      url: `${API_URL}${url}`,
      status: response.status,
      message: error.message,
      code: error.code,
    })
    
    throw error
  }
  
  if (isDebugMode()) {
    logger.debug('[ApiClient] Mutation successful', {
      method,
      url: `${API_URL}${url}`,
      status: response.status,
    })
  }
  
  // Handle 204 No Content responses
  if (response.status === 204) {
    return { success: true } as ApiResponse<T>
  }
  
  return response.json() as Promise<ApiResponse<T>>
}

/**
 * Gets the base API URL.
 * 
 * @returns The base API URL
 */
export function getApiUrl(): string {
  return API_URL
}
