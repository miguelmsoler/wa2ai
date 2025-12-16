/**
 * Routes management page.
 * 
 * Displays the list of message routes and provides interface for managing
 * routing rules (create, update, delete routes).
 * 
 * @returns React component for routes management page
 */
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Plus, Route as RouteIcon } from 'lucide-react'
import { useRoutes } from '@/lib/hooks/use-routes'
import { useDeleteRoute } from '@/lib/hooks/use-route-mutations'
import { useToast } from '@/lib/hooks/use-toast'
import { RouteCard } from '@/components/routes/route-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardSkeletonCustom } from '@/components/ui/card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Route } from '@/lib/types'

/**
 * Skeleton for search and filter controls.
 */
function SearchFilterSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full sm:w-[200px]" />
    </div>
  )
}

/**
 * Skeleton for route card.
 */
function RouteCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <CardSkeletonCustom className="h-6 w-48" />
          <CardSkeletonCustom className="h-4 w-32" />
        </div>
        <CardSkeletonCustom className="h-6 w-16" />
      </div>
      <div className="space-y-2">
        <CardSkeletonCustom className="h-4 w-24" />
        <CardSkeletonCustom className="h-4 w-full" />
      </div>
      <div className="flex gap-2 pt-2">
        <CardSkeletonCustom className="h-9 flex-1" />
        <CardSkeletonCustom className="h-9 flex-1" />
      </div>
    </div>
  )
}

/**
 * Filter type for route filtering.
 */
type FilterType = 'all' | 'lab' | 'prod' | 'with-regex' | 'without-regex'

export default function RoutesPage() {
  const { routes, isLoading, mutate } = useRoutes()
  const deleteRoute = useDeleteRoute()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Filters routes based on search query and filter type.
   * 
   * Search matches channelId or agentEndpoint (case-insensitive).
   * Filter options:
   * - 'all': Show all routes
   * - 'lab': Show only lab routes
   * - 'prod': Show only prod routes
   * - 'with-regex': Show only routes with regexFilter
   * - 'without-regex': Show only routes without regexFilter
   */
  const filteredRoutes = useMemo(() => {
    let filtered = routes

    // Apply search filter (channelId or agentEndpoint)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(
        (route) =>
          route.channelId.toLowerCase().includes(query) ||
          route.agentEndpoint.toLowerCase().includes(query)
      )
    }

    // Apply filter type
    switch (filterType) {
      case 'lab':
        filtered = filtered.filter((route) => route.environment === 'lab')
        break
      case 'prod':
        filtered = filtered.filter((route) => route.environment === 'prod')
        break
      case 'with-regex':
        filtered = filtered.filter((route) => route.regexFilter != null && route.regexFilter !== '')
        break
      case 'without-regex':
        filtered = filtered.filter((route) => route.regexFilter == null || route.regexFilter === '')
        break
      case 'all':
      default:
        // No additional filtering needed
        break
    }

    return filtered
  }, [routes, searchQuery, filterType])

  /**
   * Opens the delete confirmation dialog for a route.
   * 
   * @param route - Route to delete
   */
  const handleDeleteClick = (route: Route) => {
    setRouteToDelete(route)
    setDeleteDialogOpen(true)
  }

  /**
   * Closes the delete confirmation dialog.
   */
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setRouteToDelete(null)
  }

  /**
   * Deletes the selected route after confirmation.
   * 
   * Calls the deleteRoute API, refreshes the routes list, and shows
   * success/error toast notifications.
   */
  const handleDeleteConfirm = async () => {
    if (!routeToDelete) return

    setIsDeleting(true)
    try {
      await deleteRoute(routeToDelete.channelId)
      
      // Refresh routes list
      await mutate()
      
      toast({
        title: 'Route deleted',
        description: `Route "${routeToDelete.channelId}" has been deleted successfully.`,
        variant: 'default',
      })
      
      setDeleteDialogOpen(false)
      setRouteToDelete(null)
    } catch (error) {
      toast({
        title: 'Error deleting route',
        description: error instanceof Error 
          ? error.message 
          : 'Failed to delete route. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
          <p className="text-muted-foreground">
            List, search, filter and manage all message routes.
          </p>
        </div>
        <Button asChild>
          <Link href="/routes/new">
            <Plus className="h-4 w-4 mr-2" />
            New Route
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Routes List</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search routes by channel ID or endpoint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                <SelectItem value="lab">Lab Only</SelectItem>
                <SelectItem value="prod">Prod Only</SelectItem>
                <SelectItem value="with-regex">With Regex</SelectItem>
                <SelectItem value="without-regex">Without Regex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          {!isLoading && (
            <div className="text-sm text-muted-foreground mb-4">
              Showing {filteredRoutes.length} of {routes.length} route{routes.length !== 1 ? 's' : ''}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Routes Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RouteCardSkeleton />
          <RouteCardSkeleton />
          <RouteCardSkeleton />
        </div>
      ) : filteredRoutes.length === 0 ? (
        routes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <EmptyState
                icon={RouteIcon}
                title="No routes configured"
                description="Get started by creating your first route to connect WhatsApp messages to AI agents."
                action={
                  <Button asChild>
                    <Link href="/routes/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Route
                    </Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <EmptyState
                icon={Search}
                title="No routes match your search"
                description="Try adjusting your search query or filter criteria to find routes."
              />
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoutes.map((route) => (
            <RouteCard
              key={route.channelId}
              route={route}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the route{' '}
              <span className="font-mono font-semibold">
                {routeToDelete?.channelId}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
