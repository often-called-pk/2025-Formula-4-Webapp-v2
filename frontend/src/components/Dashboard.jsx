import React, { memo, useState, useCallback } from 'react'
import {
  DashboardGrid,
  DashboardSection,
  StatsGrid,
  ChartsGrid,
  MetricCard,
  RacingCard,
  DashboardCard,
  StatusIndicator,
  DataDisplay,
  RacingProgress,
  Button,
  DashboardSkeleton,
  ChartErrorBoundary,
  DashboardErrorBoundary,
  withErrorBoundary,
} from './ui'

// Memoized stat card component
const StatCard = memo(({ title, value, unit, change, trend, variant = "racing" }) => {
  return (
    <MetricCard
      title={title}
      value={value}
      unit={unit}
      change={change}
      trend={trend}
      variant={variant}
      className="hover:scale-105 transition-transform duration-200"
    />
  )
})
StatCard.displayName = "StatCard"

// Memoized chart placeholder component
const ChartPlaceholder = memo(({ title, description, height = "h-64" }) => {
  return (
    <RacingCard className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className={`${height} bg-gradient-to-br from-racing-red/10 via-transparent to-neon-blue/10 rounded-lg border-2 border-dashed border-muted flex items-center justify-center`}>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto bg-racing-gradient rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Chart visualization will appear here</p>
          </div>
        </div>
      </div>
    </RacingCard>
  )
})
ChartPlaceholder.displayName = "ChartPlaceholder"

// System status component
const SystemStatus = memo(() => {
  return (
    <DashboardCard className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dashboard">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Telemetry System</span>
            <StatusIndicator status="online">Online</StatusIndicator>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Data Processing</span>
            <StatusIndicator status="processing">Processing</StatusIndicator>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">API Gateway</span>
            <StatusIndicator status="online">Healthy</StatusIndicator>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Database</span>
            <StatusIndicator status="warning">Slow</StatusIndicator>
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          <DataDisplay 
            label="System Load"
            value="67"
            unit="%"
            variant="dashboard"
          />
          <RacingProgress value={67} variant="dashboard" />
        </div>
      </div>
    </DashboardCard>
  )
})
SystemStatus.displayName = "SystemStatus"

// Main dashboard component
const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => setIsLoading(false), 2000)
  }, [])

  if (isLoading) {
    return <DashboardSkeleton variant="racing" />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardSection
        title="Race Analytics Dashboard"
        subtitle="Real-time telemetry data and performance metrics"
        action={
          <Button variant="racing" onClick={handleRefresh}>
            🔄 Refresh Data
          </Button>
        }
      >
        {/* Quick Stats */}
        <DashboardErrorBoundary title="Stats Error">
          <StatsGrid>
            <StatCard
              title="Lap Time"
              value="1:23.456"
              change="+0.234"
              trend="down"
              variant="racing"
            />
            <StatCard
              title="Top Speed"
              value="247"
              unit="km/h"
              change="+5.2"
              trend="up"
              variant="neon"
            />
            <StatCard
              title="G-Force Peak"
              value="3.2"
              unit="G"
              change="-0.1"
              trend="down"
              variant="dashboard"
            />
            <StatCard
              title="Tire Temp"
              value="98"
              unit="°C"
              change="+12"
              trend="up"
              variant="default"
            />
          </StatsGrid>
        </DashboardErrorBoundary>
      </DashboardSection>

      {/* Charts Section */}
      <DashboardSection title="Performance Analysis">
        <ChartsGrid>
          <ChartErrorBoundary title="Speed Chart Error">
            <ChartPlaceholder 
              title="Speed vs Distance"
              description="Interactive speed visualization along track distance"
            />
          </ChartErrorBoundary>
          
          <ChartErrorBoundary title="Lap Delta Error">
            <ChartPlaceholder 
              title="Lap Delta Comparison"
              description="Time gained/lost compared to reference lap"
            />
          </ChartErrorBoundary>
        </ChartsGrid>
      </DashboardSection>

      {/* Detailed Analysis */}
      <DashboardSection title="Detailed Analysis">
        <DashboardGrid cols={3} gap="lg">
          <ChartErrorBoundary title="Engine Data Error">
            <ChartPlaceholder 
              title="Engine Vitals"
              description="RPM, oil temp, water temp over time"
              height="h-48"
            />
          </ChartErrorBoundary>
          
          <ChartErrorBoundary title="G-Force Error">
            <ChartPlaceholder 
              title="G-Force Analysis"
              description="Lateral and longitudinal G-forces"
              height="h-48"
            />
          </ChartErrorBoundary>
          
          <SystemStatus />
        </DashboardGrid>
      </DashboardSection>

      {/* Track Map Section */}
      <DashboardSection title="Track Analysis">
        <RacingCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">3D Track Map</h3>
                <p className="text-sm text-muted-foreground">Interactive track visualization with driver positioning</p>
              </div>
              <Button variant="outline" size="sm">
                🗺️ Full Screen
              </Button>
            </div>
            <div className="h-96 bg-gradient-to-br from-racing-red/5 via-transparent to-neon-blue/5 rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-racing-gradient rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">3D track map will be rendered here</p>
              </div>
            </div>
          </div>
        </RacingCard>
      </DashboardSection>
    </div>
  )
}

// Export with error boundary wrapper
export default withErrorBoundary(Dashboard, {
  variant: "racing",
  title: "Dashboard Error",
  description: "The main dashboard failed to load. Please refresh the page and try again."
}) 