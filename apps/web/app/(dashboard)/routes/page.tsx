/**
 * Routes management page.
 * 
 * Displays the list of message routes and provides interface for managing
 * routing rules (create, update, delete routes).
 * 
 * @returns React component for routes management page
 */
'use client'

import { useRoutes } from '@/lib/hooks/use-routes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeletonCustom } from '@/components/ui/card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton for route list item.
 */
function RouteListItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  )
}

export default function RoutesPage() {
  const { routes, isLoading } = useRoutes()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
          <p className="text-muted-foreground">
            List, search, filter and manage all message routes.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Routes List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <RouteListItemSkeleton />
              <RouteListItemSkeleton />
              <RouteListItemSkeleton />
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No routes configured yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {routes.map((route) => (
                <div
                  key={route.channelId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold">{route.channelId}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {route.agentEndpoint}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-muted">
                        {route.environment}
                      </span>
                      {route.regexFilter && (
                        <span className="text-xs px-2 py-1 rounded bg-muted">
                          Regex: {route.regexFilter}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm border rounded hover:bg-muted">
                      Edit
                    </button>
                    <button className="px-4 py-2 text-sm border rounded hover:bg-muted text-destructive">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
