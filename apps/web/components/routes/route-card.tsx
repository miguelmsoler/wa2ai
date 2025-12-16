/**
 * Route Card component.
 * 
 * Displays a single route with its information (channelId, agentEndpoint,
 * environment, regexFilter) and action buttons (Edit, Delete).
 * 
 * @module components/routes/route-card
 */

'use client'

import Link from 'next/link'
import { Route } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ExternalLink, 
  Edit, 
  Trash2, 
  Hash, 
  Globe,
  Filter,
  FlaskConical,
  Server
} from 'lucide-react'

/**
 * Route Card component props.
 */
export interface RouteCardProps {
  /** Route data to display */
  route: Route
  /** Callback when edit button is clicked */
  onEdit?: (route: Route) => void
  /** Callback when delete button is clicked */
  onDelete?: (route: Route) => void
}

/**
 * Route Card component.
 * 
 * Displays route information in a card format with:
 * - Channel ID with icon
 * - Agent endpoint with icon
 * - Environment badge (lab/prod)
 * - Regex filter badge (if present)
 * - ADK configuration info (if present)
 * - Action buttons (Edit, Delete)
 * 
 * @param props - Route card component props
 * @param props.route - Route data to display
 * @param props.onEdit - Optional callback for edit action
 * @param props.onDelete - Optional callback for delete action
 * @returns React component for route card
 */
export function RouteCard({ route, onEdit, onDelete }: RouteCardProps) {
  const editUrl = `/routes/${encodeURIComponent(route.channelId)}/edit`
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
            <CardTitle className="text-lg truncate" title={route.channelId}>
              {route.channelId}
            </CardTitle>
          </div>
          <Badge 
            variant={route.environment === 'prod' ? 'default' : 'secondary'}
            className="shrink-0"
          >
            {route.environment === 'prod' ? (
              <>
                <Server className="h-3 w-3 mr-1" />
                Prod
              </>
            ) : (
              <>
                <FlaskConical className="h-3 w-3 mr-1" />
                Lab
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Endpoint */}
        <div className="flex items-start gap-2">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Agent Endpoint</p>
            <p className="text-sm font-mono truncate" title={route.agentEndpoint}>
              {route.agentEndpoint}
            </p>
          </div>
        </div>

        {/* Regex Filter */}
        {route.regexFilter && (
          <div className="flex items-start gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Regex Filter</p>
              <Badge variant="outline" className="font-mono text-xs">
                {route.regexFilter}
              </Badge>
            </div>
          </div>
        )}

        {/* ADK Configuration */}
        {route.config?.adk && (
          <div className="flex items-start gap-2">
            <Server className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">ADK Agent</p>
              <div className="space-y-1">
                <p className="text-sm font-medium">{route.config.adk.appName}</p>
                {route.config.adk.baseUrl && (
                  <p className="text-xs text-muted-foreground font-mono truncate" title={route.config.adk.baseUrl}>
                    Base URL: {route.config.adk.baseUrl}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Link href={editUrl}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => onDelete?.(route)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
