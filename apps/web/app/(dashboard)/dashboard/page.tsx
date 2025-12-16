import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RoutesSummaryCard } from '@/components/dashboard/routes-summary-card'
import { ConnectionStatusCard } from '@/components/dashboard/connection-status-card'

/**
 * Dashboard page component.
 * 
 * Displays system status overview and quick access to main functions.
 * Shows connection status, active routes summary, and other key metrics.
 * 
 * @returns React component for dashboard page
 */
export default function DashboardPage() {
  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            System status overview and quick access to main functions.
          </p>
        </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Connection Status Card */}
        <ConnectionStatusCard />
        
        {/* Routes Summary Card */}
        <RoutesSummaryCard />
      </div>

      {/* Quick Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Quick access to common tasks and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/routes/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Route
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/connection">
                <Settings className="mr-2 h-4 w-4" />
                Connection Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
