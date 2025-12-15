export default function ConnectionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WhatsApp Connection</h1>
        <p className="text-muted-foreground">
          Manage WhatsApp authentication and connection via QR code.
        </p>
      </div>
      
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
        <p className="text-sm text-muted-foreground">
          QR code display and connection management will be implemented here.
        </p>
      </div>
    </div>
  )
}
