/**
 * API client exports.
 * 
 * This module re-exports all API client functions for convenience.
 * 
 * @module lib/api
 */

export { fetcher, mutator, getApiUrl } from './client'
export { createRoute, updateRoute, deleteRoute } from './routes'
export { getQRImageUrl } from './connection'
