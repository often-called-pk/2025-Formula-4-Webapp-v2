import { lazy, Suspense } from 'react'
import { DashboardSkeleton, ChartSkeleton, RacingSpinner, LoadingText } from './ui'

// Racing-themed suspense fallback
const RacingSuspenseFallback = ({ type = "dashboard", message = "Loading..." }) => {
  const fallbacks = {
    dashboard: <DashboardSkeleton variant="racing" />,
    chart: <ChartSkeleton variant="racing" height="h-96" />,
    card: <div className="flex items-center justify-center h-64 rounded-lg border border-racing-red/30">
      <LoadingText variant="racing">{message}</LoadingText>
    </div>,
    spinner: <div className="flex items-center justify-center h-32">
      <RacingSpinner size="lg" variant="racing" />
    </div>
  }
  
  return fallbacks[type] || fallbacks.spinner
}

// Lazy-loaded page components
export const LazyDashboard = lazy(() => 
  import('./Dashboard').then(module => ({
    default: module.default
  }))
)

export const LazyUpload = lazy(() => 
  import('../pages/Upload').then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <div>Upload component not found</div>
  }))
)

export const LazyAnalysis = lazy(() => 
  import('../pages/Analysis').then(module => ({
    default: module.default
  })).catch(() => ({
    default: () => <div>Analysis component not found</div>
  }))
)

// Lazy-loaded UI components for heavy features
export const LazyChartComponents = {
  SpeedChart: lazy(() => 
    import('./charts/SpeedChart').then(module => ({
      default: module.default || (() => <div>Speed Chart</div>)
    })).catch(() => ({
      default: () => <div>Speed Chart component not available</div>
    }))
  ),
  
  DeltaChart: lazy(() => 
    import('./charts/DeltaChart').then(module => ({
      default: module.default || (() => <div>Delta Chart</div>)
    })).catch(() => ({
      default: () => <div>Delta Chart component not available</div>
    }))
  ),
  
  TrackMap3D: lazy(() => 
    import('./charts/TrackMap3D').then(module => ({
      default: module.default || (() => <div>3D Track Map</div>)
    })).catch(() => ({
      default: () => <div>3D Track Map component not available</div>
    }))
  )
}

// HOC for wrapping components with Suspense
export const withSuspense = (LazyComponent, fallbackType = "spinner", loadingMessage) => {
  const SuspenseWrapper = (props) => (
    <Suspense fallback={<RacingSuspenseFallback type={fallbackType} message={loadingMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  )
  
  SuspenseWrapper.displayName = `withSuspense(${LazyComponent.displayName || 'LazyComponent'})`
  
  return SuspenseWrapper
}

// Pre-wrapped components ready to use
export const DashboardWithSuspense = withSuspense(LazyDashboard, "dashboard", "Loading Dashboard...")
export const UploadWithSuspense = withSuspense(LazyUpload, "card", "Loading Upload...")
export const AnalysisWithSuspense = withSuspense(LazyAnalysis, "chart", "Loading Analysis...")

// Chart components with suspense
export const SpeedChartWithSuspense = withSuspense(
  LazyChartComponents.SpeedChart, 
  "chart", 
  "Loading Speed Chart..."
)

export const DeltaChartWithSuspense = withSuspense(
  LazyChartComponents.DeltaChart, 
  "chart", 
  "Loading Delta Chart..."
)

export const TrackMap3DWithSuspense = withSuspense(
  LazyChartComponents.TrackMap3D, 
  "chart", 
  "Loading 3D Track Map..."
)

// Preload utility for performance optimization
export const preloadComponent = (componentPromise) => {
  if (typeof componentPromise === 'function') {
    componentPromise()
  }
}

// Preload functions for critical components
export const preloadDashboard = () => preloadComponent(() => import('./Dashboard'))
export const preloadCharts = () => {
  preloadComponent(() => import('./charts/SpeedChart'))
  preloadComponent(() => import('./charts/DeltaChart'))
}

// Performance monitoring wrapper
export const withPerformanceMonitoring = (Component, componentName) => {
  const MonitoredComponent = (props) => {
    const startTime = performance.now()
    
    React.useEffect(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      if (renderTime > 100) { // Log slow renders
        console.warn(`Slow render detected for ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
    })
    
    return <Component {...props} />
  }
  
  MonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`
  
  return MonitoredComponent
}

export { RacingSuspenseFallback } 