/**
 * Zod validation schemas for Route domain model.
 * 
 * These schemas can be used for form validation with react-hook-form
 * and can potentially be shared with the backend for API validation.
 * 
 * Following Clean Architecture, this is part of the Domain Layer.
 * 
 * @module lib/schemas/route
 */

import { z } from 'zod'

/**
 * Schema for ADK configuration within a route.
 */
export const adkConfigSchema = z.object({
  appName: z.string().min(1, 'App name is required'),
  baseUrl: z.string().url('Base URL must be a valid URL').optional(),
})

/**
 * Schema for route configuration object.
 */
export const routeConfigSchema = z.object({
  adk: adkConfigSchema.optional(),
}).passthrough() // Allow additional fields

/**
 * Schema for Route domain model.
 * 
 * This schema validates route data and can be used with react-hook-form.
 */
export const routeSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
  agentEndpoint: z.string().url('Agent endpoint must be a valid URL'),
  environment: z.enum(['lab', 'prod'], {
    message: 'Environment must be either "lab" or "prod"',
  }),
  regexFilter: z.string().optional(),
  config: routeConfigSchema.optional(),
})

/**
 * Type inferred from route schema.
 * 
 * Use this type for form data that has been validated.
 */
export type RouteFormData = z.infer<typeof routeSchema>

/**
 * Schema for creating a new route (all fields required except optional ones).
 */
export const createRouteSchema = routeSchema

/**
 * Schema for updating a route (all fields optional).
 */
export const updateRouteSchema = routeSchema.partial()
