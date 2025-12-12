/**
 * PostgreSQL implementation of RoutesRepository.
 * 
 * This module provides a database-backed implementation for storing
 * and retrieving routing rules. Following Clean Architecture, this is
 * an infrastructure concern that implements the core RoutesRepository interface.
 * 
 * @module infra/postgres-routes-repository
 */

import type { Route } from '../core/models.js'
import type { MutableRoutesRepository } from '../core/router-service.js'
import { logger, isDebugMode } from '../core/logger.js'
import { Pool } from 'pg'

/**
 * Configuration for PostgreSQL routes repository.
 */
export interface PostgresRoutesRepositoryConfig {
  /** PostgreSQL connection host (default: 'postgres') */
  host?: string
  /** PostgreSQL connection port (default: 5432) */
  port?: number
  /** PostgreSQL database name (default: 'evolution_lab') */
  database?: string
  /** PostgreSQL username (default: 'evolution') */
  user?: string
  /** PostgreSQL password (default: 'evolution_pass') */
  password?: string
  /** Connection pool configuration */
  pool?: {
    min?: number
    max?: number
    idleTimeoutMillis?: number
  }
}

/**
 * Default configuration for PostgreSQL routes repository.
 */
const DEFAULT_CONFIG = {
  host: 'postgres',
  port: 5432,
  database: 'evolution_lab',
  user: 'evolution',
  password: 'evolution_pass',
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  },
} as const

/**
 * PostgreSQL implementation of RoutesRepository.
 * 
 * This repository stores routes in a PostgreSQL database, providing
 * persistence across container restarts and better scalability.
 * 
 * @example
 * ```typescript
 * const repository = new PostgresRoutesRepository({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'wa2ai',
 *   user: 'wa2ai',
 *   password: 'password'
 * })
 * await repository.addRoute({
 *   channelId: '5491155551234',
 *   agentEndpoint: 'http://localhost:8000/agent',
 *   environment: 'lab'
 * })
 * const route = await repository.findByChannelId('5491155551234')
 * ```
 */
export class PostgresRoutesRepository implements MutableRoutesRepository {
  private pool: Pool
  private routeCountCache: number | null = null

  constructor(config: PostgresRoutesRepositoryConfig = {}) {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Constructor called', {
        hasHost: !!config.host,
        hasPort: !!config.port,
        hasDatabase: !!config.database,
        hasUser: !!config.user,
        hasPassword: !!config.password,
        hasPoolConfig: !!config.pool,
      })
    }

    const finalConfig = {
      host: config.host ?? DEFAULT_CONFIG.host,
      port: config.port ?? DEFAULT_CONFIG.port,
      database: config.database ?? DEFAULT_CONFIG.database,
      user: config.user ?? DEFAULT_CONFIG.user,
      password: config.password ?? DEFAULT_CONFIG.password,
      pool: {
        min: config.pool?.min ?? DEFAULT_CONFIG.pool.min,
        max: config.pool?.max ?? DEFAULT_CONFIG.pool.max,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis ?? DEFAULT_CONFIG.pool.idleTimeoutMillis,
      },
    }

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Configuration resolved', {
        host: finalConfig.host,
        port: finalConfig.port,
        database: finalConfig.database,
        user: finalConfig.user,
        poolMin: finalConfig.pool.min,
        poolMax: finalConfig.pool.max,
        idleTimeoutMillis: finalConfig.pool.idleTimeoutMillis,
      })
    }

    this.pool = new Pool({
      host: finalConfig.host,
      port: finalConfig.port,
      database: finalConfig.database,
      user: finalConfig.user,
      password: finalConfig.password,
      min: finalConfig.pool.min,
      max: finalConfig.pool.max,
      idleTimeoutMillis: finalConfig.pool.idleTimeoutMillis,
    })

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('[PostgresRoutesRepository] Unexpected error on idle client', {
        error: err instanceof Error ? err.message : String(err),
      })
    })

    // Handle pool connect events (debug only)
    if (isDebugMode()) {
      this.pool.on('connect', () => {
        logger.debug('[PostgresRoutesRepository] New client connected to pool')
      })
    }

    logger.info('[PostgresRoutesRepository] Initialized', {
      host: finalConfig.host,
      port: finalConfig.port,
      database: finalConfig.database,
      user: finalConfig.user,
      poolMin: finalConfig.pool.min,
      poolMax: finalConfig.pool.max,
    })
  }

  /**
   * Finds a route by channel ID.
   * 
   * @param channelId - The channel identifier
   * @returns Promise resolving to the route if found, null otherwise
   */
  async findByChannelId(channelId: string): Promise<Route | null> {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] findByChannelId called', {
        channelId,
        cacheCount: this.routeCountCache,
      })
    }

    const client = await this.pool.connect()

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Database client acquired from pool')
    }

    try {
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Executing query', {
          query: 'SELECT ... WHERE channel_id = $1',
          channelId,
        })
      }

      const result = await client.query<{
        channel_id: string
        agent_endpoint: string
        environment: string
        regex_filter: string | null
        config: Record<string, unknown> | null
        created_at: Date
        updated_at: Date
      }>(
        'SELECT channel_id, agent_endpoint, environment, regex_filter, config, created_at, updated_at FROM routes WHERE channel_id = $1',
        [channelId]
      )

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Query executed', {
          rowCount: result.rows.length,
          channelId,
        })
      }

      if (result.rows.length === 0) {
        if (isDebugMode()) {
          logger.debug('[PostgresRoutesRepository] Route not found', { channelId })
        }
        return null
      }

      const row = result.rows[0]

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Mapping database row to Route', {
          channelId: row.channel_id,
          agentEndpoint: row.agent_endpoint,
          environment: row.environment,
        })
      }

      const route = this.mapRowToRoute(row)

      logger.info('[PostgresRoutesRepository] Route found', {
        channelId,
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
      })

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] findByChannelId completed successfully', {
          channelId,
          hasRoute: true,
        })
      }

      return route
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[PostgresRoutesRepository] Error finding route', {
        channelId,
        error: errorMessage,
      })
      throw new Error(`Failed to find route: ${errorMessage}`)
    } finally {
      client.release()
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Database client released to pool')
      }
    }
  }

  /**
   * Lists all available routes.
   * 
   * @returns Promise resolving to array of all routes
   */
  async findAll(): Promise<Route[]> {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] findAll called', {
        cacheCount: this.routeCountCache,
      })
    }

    const client = await this.pool.connect()

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Database client acquired from pool')
    }

    try {
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Executing query', {
          query: 'SELECT ... ORDER BY created_at ASC',
        })
      }

      const result = await client.query<{
        channel_id: string
        agent_endpoint: string
        environment: string
        regex_filter: string | null
        config: Record<string, unknown> | null
        created_at: Date
        updated_at: Date
      }>(
        'SELECT channel_id, agent_endpoint, environment, regex_filter, config, created_at, updated_at FROM routes ORDER BY created_at ASC'
      )

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Query executed', {
          rowCount: result.rows.length,
        })
      }

      const routes = result.rows.map((row) => this.mapRowToRoute(row))
      
      // Update cache
      const previousCache = this.routeCountCache
      this.routeCountCache = routes.length

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Cache updated', {
          previousCache,
          newCache: this.routeCountCache,
          routeCount: routes.length,
        })
      }

      logger.info('[PostgresRoutesRepository] Found routes', {
        count: routes.length,
      })

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] findAll completed successfully', {
          routeCount: routes.length,
        })
      }

      return routes
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[PostgresRoutesRepository] Error finding all routes', {
        error: errorMessage,
      })
      throw new Error(`Failed to find all routes: ${errorMessage}`)
    } finally {
      client.release()
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Database client released to pool')
      }
    }
  }

  /**
   * Adds a route to the repository.
   * 
   * @param route - The route to add
   * @returns Promise that resolves when the route is added
   */
  async addRoute(route: Route): Promise<void> {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] addRoute called', {
        channelId: route.channelId,
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
        hasRegexFilter: !!route.regexFilter,
        hasConfig: !!route.config,
      })
    }

    const client = await this.pool.connect()

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Database client acquired from pool')
    }

    try {
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Executing INSERT ... ON CONFLICT query', {
          channelId: route.channelId,
          agentEndpoint: route.agentEndpoint,
          environment: route.environment,
        })
      }

      const result = await client.query(
        `INSERT INTO routes (channel_id, agent_endpoint, environment, regex_filter, config)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (channel_id) 
         DO UPDATE SET 
           agent_endpoint = EXCLUDED.agent_endpoint,
           environment = EXCLUDED.environment,
           regex_filter = EXCLUDED.regex_filter,
           config = EXCLUDED.config,
           updated_at = CURRENT_TIMESTAMP`,
        [
          route.channelId,
          route.agentEndpoint,
          route.environment,
          route.regexFilter || null,
          route.config ? JSON.stringify(route.config) : null,
        ]
      )

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Query executed', {
          rowCount: result.rowCount,
          channelId: route.channelId,
        })
      }

      // Invalidate cache - refresh count
      const previousCache = this.routeCountCache
      await this.refreshRouteCount()

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Cache refreshed after add', {
          previousCache,
          newCache: this.routeCountCache,
        })
      }

      logger.info('[PostgresRoutesRepository] Route added', {
        channelId: route.channelId,
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
      })

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] addRoute completed successfully', {
          channelId: route.channelId,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[PostgresRoutesRepository] Error adding route', {
        channelId: route.channelId,
        agentEndpoint: route.agentEndpoint,
        environment: route.environment,
        error: errorMessage,
      })
      throw new Error(`Failed to add route: ${errorMessage}`)
    } finally {
      client.release()
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Database client released to pool')
      }
    }
  }

  /**
   * Removes a route from the repository.
   * 
   * @param channelId - The channel ID of the route to remove
   * @returns Promise that resolves to true if route was removed, false otherwise
   */
  async removeRoute(channelId: string): Promise<boolean> {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] removeRoute called', {
        channelId,
        cacheCount: this.routeCountCache,
      })
    }

    const client = await this.pool.connect()

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Database client acquired from pool')
    }

    try {
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Executing DELETE query', {
          channelId,
        })
      }

      const result = await client.query(
        'DELETE FROM routes WHERE channel_id = $1',
        [channelId]
      )

      const existed = result.rowCount !== null && result.rowCount > 0

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Query executed', {
          rowCount: result.rowCount,
          existed,
          channelId,
        })
      }

      if (existed) {
        // Invalidate cache - refresh count
        const previousCache = this.routeCountCache
        await this.refreshRouteCount()

        if (isDebugMode()) {
          logger.debug('[PostgresRoutesRepository] Cache refreshed after remove', {
            previousCache,
            newCache: this.routeCountCache,
          })
        }

        logger.info('[PostgresRoutesRepository] Route removed', { channelId })
      } else {
        if (isDebugMode()) {
          logger.debug('[PostgresRoutesRepository] Route not found for removal', { channelId })
        }
      }

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] removeRoute completed', {
          channelId,
          existed,
        })
      }

      return existed
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[PostgresRoutesRepository] Error removing route', {
        channelId,
        error: errorMessage,
      })
      throw new Error(`Failed to remove route: ${errorMessage}`)
    } finally {
      client.release()
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Database client released to pool')
      }
    }
  }

  /**
   * Clears all routes from the repository.
   * 
   * @returns Promise that resolves when all routes are cleared
   */
  async clear(): Promise<void> {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] clear called', {
        cacheCount: this.routeCountCache,
      })
    }

    const client = await this.pool.connect()

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Database client acquired from pool')
    }

    try {
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Executing DELETE FROM routes query')
      }

      const result = await client.query('DELETE FROM routes')
      const count = result.rowCount ?? 0

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Query executed', {
          rowCount: count,
        })
      }

      const previousCache = this.routeCountCache
      this.routeCountCache = 0

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Cache updated', {
          previousCache,
          newCache: this.routeCountCache,
        })
      }

      logger.info('[PostgresRoutesRepository] All routes cleared', { count })

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] clear completed successfully', {
          clearedCount: count,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[PostgresRoutesRepository] Error clearing routes', {
        error: errorMessage,
      })
      throw new Error(`Failed to clear routes: ${errorMessage}`)
    } finally {
      client.release()
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Database client released to pool')
      }
    }
  }

  /**
   * Gets the number of routes in the repository.
   * 
   * Note: This method is synchronous for compatibility with InMemoryRoutesRepository.
   * For PostgreSQL, this uses a cached count that is updated on route changes.
   * The cache is invalidated when routes are added/removed/cleared.
   * 
   * @returns The number of routes (from cache, may be null if not yet initialized)
   */
  getRouteCount(): number {
    const count = this.routeCountCache ?? 0

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] getRouteCount called', {
        cachedCount: count,
        cacheInitialized: this.routeCountCache !== null,
      })
    }

    // Return cached count if available, otherwise return 0
    // The cache will be updated on the next route operation
    return count
  }

  /**
   * Refreshes the route count cache from the database.
   * 
   * This is called automatically when routes are modified, but can be
   * called manually to ensure the count is up to date.
   * 
   * @returns Promise resolving to the number of routes
   */
  private async refreshRouteCount(): Promise<number> {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] refreshRouteCount called', {
        previousCache: this.routeCountCache,
      })
    }

    const client = await this.pool.connect()

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] Database client acquired from pool for count refresh')
    }

    try {
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Executing COUNT query')
      }

      const result = await client.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM routes'
      )
      const count = parseInt(result.rows[0].count, 10)

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] COUNT query executed', {
          count,
          previousCache: this.routeCountCache,
        })
      }

      this.routeCountCache = count

      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Cache updated', {
          newCache: this.routeCountCache,
        })
      }

      return count
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[PostgresRoutesRepository] Error refreshing route count', {
        error: errorMessage,
      })
      throw new Error(`Failed to refresh route count: ${errorMessage}`)
    } finally {
      client.release()
      if (isDebugMode()) {
        logger.debug('[PostgresRoutesRepository] Database client released to pool after count refresh')
      }
    }
  }

  /**
   * Closes the database connection pool.
   * 
   * Call this method when shutting down the application to gracefully
   * close all database connections.
   */
  async close(): Promise<void> {
    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] close called', {
        cacheCount: this.routeCountCache,
      })
    }

    await this.pool.end()

    logger.info('[PostgresRoutesRepository] Connection pool closed')

    if (isDebugMode()) {
      logger.debug('[PostgresRoutesRepository] close completed successfully')
    }
  }

  /**
   * Maps a database row to a Route domain model.
   * 
   * @param row - Database row from routes table
   * @returns Route domain model
   */
  private mapRowToRoute(row: {
    channel_id: string
    agent_endpoint: string
    environment: string
    regex_filter?: string | null
    config?: Record<string, unknown> | null
  }): Route {
    return {
      channelId: row.channel_id,
      agentEndpoint: row.agent_endpoint,
      environment: row.environment as 'lab' | 'prod',
      regexFilter: row.regex_filter || undefined,
      config: row.config || undefined,
    }
  }
}
