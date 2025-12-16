/**
 * Routes Summary Card component.
 * 
 * Displays a summary of active routes with statistics (total, lab, prod)
 * and quick action buttons to manage routes.
 * 
 * @module components/dashboard/routes-summary-card
 */

'use client'

import Link from 'next/link'
import { useRoutes } from '@/lib/hooks/use-routes'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Route } from '@/lib/types'
import { AlertCircle, Plus, Settings } from 'lucide-react'

/**
 * Calculates route statistics from a list of routes.
 * 
 * @param routes - Array of routes to analyze
 * @returns Object with total, lab, and prod route counts
 */
function calculateRouteStats(routes: Route[]) {
  const total = routes.length
  const lab = routes.filter((route) => route.environment === 'lab').length
  const prod = routes.filter((route) => route.environment === 'prod').length

  return { total, lab, prod }
}

/**
 * Routes Summary Card component.
 * 
 * Displays:
 * - Total number of routes
 * - Number of lab routes
 * - Number of prod routes
 * - Action buttons to manage routes or create new ones
 * 
 * Handles loading and error states gracefully.
 * 
 * @returns React component for routes summary card
 */
export function RoutesSummaryCard() {
  const { routes, isLoading, isError } = useRoutes()

  // Calculate statistics
  const stats = routes ? calculateRouteStats(routes) : { total: 0, lab: 0, prod: 0 }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Active Routes
        </CardTitle>
        <CardDescription>
          Summary of configured message routing rules
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load routes. Please try again later.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Routes</span>
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lab Routes</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.lab}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prod Routes</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.prod}
              </span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/routes">
            <Settings className="mr-2 h-4 w-4" />
            Manage Routes
          </Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href="/routes/new">
            <Plus className="mr-2 h-4 w-4" />
            New Route
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
