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
        {/* Placeholder for Connection Status Card */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Connection Status</h2>
          <p className="text-sm text-muted-foreground mt-2">
            WhatsApp connection status will be displayed here.
          </p>
        </div>
        
        {/* Placeholder for Routes Summary Card */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Active Routes</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Route summary will be displayed here.
          </p>
        </div>
      </div>
    </div>
  )
}
