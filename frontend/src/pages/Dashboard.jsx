import React from 'react'

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Formula 4 Race Analytics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Analyses */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Analyses</h3>
          <p className="text-muted-foreground text-sm">
            No analyses yet. Upload telemetry files to get started.
          </p>
        </div>

        {/* Upload Files */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Upload</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Upload CSV telemetry files to start analyzing driver performance.
          </p>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            Upload Files
          </button>
        </div>

        {/* System Status */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">API Server</span>
              <span className="text-green-500 text-sm">●</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Processing</span>
              <span className="text-green-500 text-sm">●</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-green-500 text-sm">●</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 