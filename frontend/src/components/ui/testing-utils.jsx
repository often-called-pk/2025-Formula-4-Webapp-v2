import * as React from "react"
import { AccessibilityTestUtils, useAccessibilityAudit } from './accessibility-audit'

// Performance testing utilities
export const PerformanceTestUtils = {
  // Measure component render time
  measureRenderTime: (Component, props = {}) => {
    const start = performance.now()
    
    const TestWrapper = () => {
      React.useEffect(() => {
        const end = performance.now()
        console.log(`${Component.displayName || Component.name} render time: ${(end - start).toFixed(2)}ms`)
      }, [])
      
      return <Component {...props} />
    }
    
    return TestWrapper
  },
  
  // Memory usage tracking
  trackMemoryUsage: (componentName) => {
    if (performance.memory) {
      const initial = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
      
      return {
        start: () => initial,
        end: () => {
          const final = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          }
          
          const diff = final.used - initial.used
          console.log(`${componentName} memory usage: ${(diff / 1024 / 1024).toFixed(2)}MB`)
          
          return { initial, final, diff }
        }
      }
    }
    
    return {
      start: () => null,
      end: () => console.warn('Performance.memory API not available')
    }
  },
  
  // Bundle size analysis
  analyzeBundleSize: () => {
    if (typeof window !== 'undefined' && window.__webpack_require__) {
      const modules = Object.keys(window.__webpack_require__.cache || {})
      console.group('Bundle Analysis')
      console.log(`Total modules loaded: ${modules.length}`)
      
      const modulesByType = modules.reduce((acc, module) => {
        if (module.includes('node_modules')) {
          acc.vendor = (acc.vendor || 0) + 1
        } else if (module.includes('components')) {
          acc.components = (acc.components || 0) + 1
        } else {
          acc.app = (acc.app || 0) + 1
        }
        return acc
      }, {})
      
      console.table(modulesByType)
      console.groupEnd()
      
      return modulesByType
    }
    
    return null
  },
  
  // FPS monitoring
  monitorFPS: (duration = 5000) => {
    let fps = 0
    let lastTime = performance.now()
    let frameCount = 0
    
    const frame = (currentTime) => {
      frameCount++
      
      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        frameCount = 0
        lastTime = currentTime
      }
      
      if (currentTime - lastTime < duration) {
        requestAnimationFrame(frame)
      } else {
        console.log(`Average FPS over ${duration}ms: ${fps}`)
      }
    }
    
    requestAnimationFrame(frame)
  },
  
  // Core Web Vitals simulation
  measureWebVitals: () => {
    // LCP (Largest Contentful Paint) simulation
    const measureLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`)
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      
      setTimeout(() => observer.disconnect(), 10000)
    }
    
    // FID (First Input Delay) simulation
    const measureFID = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`FID: ${entry.processingStart - entry.startTime}ms`)
        }
      })
      
      observer.observe({ entryTypes: ['first-input'] })
    }
    
    // CLS (Cumulative Layout Shift) simulation
    const measureCLS = () => {
      let clsValue = 0
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        console.log(`CLS: ${clsValue.toFixed(4)}`)
      })
      
      observer.observe({ entryTypes: ['layout-shift'] })
      
      setTimeout(() => observer.disconnect(), 10000)
    }
    
    if ('PerformanceObserver' in window) {
      measureLCP()
      measureFID()
      measureCLS()
    } else {
      console.warn('PerformanceObserver not supported')
    }
  }
}

// Accessibility testing hook
export const useAccessibilityTesting = () => {
  const { auditResults, isAuditing, runAudit } = useAccessibilityAudit()
  const [testResults, setTestResults] = React.useState(null)
  
  const runFullAccessibilityTest = React.useCallback(async (element = document.body) => {
    console.log('Starting comprehensive accessibility test...')
    
    const results = {
      audit: null,
      keyboard: null,
      screenReader: null,
      contrast: null,
      timestamp: new Date().toISOString()
    }
    
    try {
      // Run main audit
      results.audit = await runAudit(element)
      
      // Test keyboard navigation
      results.keyboard = await AccessibilityTestUtils.testKeyboardNavigation(element)
      
      // Test screen reader announcements
      results.screenReader = AccessibilityTestUtils.testScreenReaderAnnouncements(element)
      
      // Test color contrast
      results.contrast = AccessibilityTestUtils.testColorContrast(element)
      
      setTestResults(results)
      
      console.log('Accessibility test completed:', results)
      
    } catch (error) {
      console.error('Accessibility test failed:', error)
    }
    
    return results
  }, [runAudit])
  
  return {
    testResults,
    isAuditing,
    runFullAccessibilityTest
  }
}

// Racing-themed test runner component
export const RacingTestRunner = ({ children, enablePerformanceTests = true, enableA11yTests = true }) => {
  const [isRunningTests, setIsRunningTests] = React.useState(false)
  const [testSummary, setTestSummary] = React.useState(null)
  const { runFullAccessibilityTest } = useAccessibilityTesting()
  
  const runAllTests = React.useCallback(async () => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Tests only run in development mode')
      return
    }
    
    setIsRunningTests(true)
    console.group('🏎️ Formula 4 Racing App Tests')
    
    const summary = {
      performance: {},
      accessibility: {},
      timestamp: new Date().toISOString()
    }
    
    try {
      if (enablePerformanceTests) {
        console.group('⚡ Performance Tests')
        
        // Bundle analysis
        summary.performance.bundle = PerformanceTestUtils.analyzeBundleSize()
        
        // FPS monitoring
        PerformanceTestUtils.monitorFPS(3000)
        
        // Web Vitals
        PerformanceTestUtils.measureWebVitals()
        
        console.groupEnd()
      }
      
      if (enableA11yTests) {
        console.group('♿ Accessibility Tests')
        
        summary.accessibility = await runFullAccessibilityTest()
        
        console.groupEnd()
      }
      
      setTestSummary(summary)
      
    } catch (error) {
      console.error('Test execution failed:', error)
    } finally {
      setIsRunningTests(false)
      console.groupEnd()
    }
  }, [enablePerformanceTests, enableA11yTests, runFullAccessibilityTest])
  
  // Auto-run tests in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (enablePerformanceTests || enableA11yTests)) {
      const timer = setTimeout(runAllTests, 2000) // Delay to allow app to load
      return () => clearTimeout(timer)
    }
  }, [runAllTests, enablePerformanceTests, enableA11yTests])
  
  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          <button
            onClick={runAllTests}
            disabled={isRunningTests}
            className="px-4 py-2 bg-racing-gradient text-white text-sm rounded border border-racing-red hover:scale-105 transition-transform disabled:opacity-50"
          >
            {isRunningTests ? '🏁 Testing...' : '🏎️ Run Tests'}
          </button>
          
          {testSummary && (
            <div className="max-w-xs p-3 bg-card border border-racing-red/30 rounded text-xs space-y-1">
              <div className="font-medium text-racing-red">Last Test Summary</div>
              <div>Time: {new Date(testSummary.timestamp).toLocaleTimeString()}</div>
              {testSummary.accessibility?.audit && (
                <div>A11y Score: {testSummary.accessibility.audit.score}%</div>
              )}
              {testSummary.performance?.bundle && (
                <div>Modules: {Object.values(testSummary.performance.bundle).reduce((a, b) => a + b, 0)}</div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// Performance monitoring HOC
export const withPerformanceMonitoring = (Component, options = {}) => {
  const MonitoredComponent = React.forwardRef((props, ref) => {
    const componentName = Component.displayName || Component.name || 'Component'
    const renderCount = React.useRef(0)
    const startTime = React.useRef(performance.now())
    
    React.useEffect(() => {
      renderCount.current += 1
      const endTime = performance.now()
      const renderTime = endTime - startTime.current
      
      if (options.logRenders && process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render ${renderCount.current}: ${renderTime.toFixed(2)}ms`)
      }
      
      if (options.warnSlowRenders && renderTime > (options.slowThreshold || 100)) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
      
      startTime.current = performance.now()
    })
    
    return <Component ref={ref} {...props} />
  })
  
  MonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`
  
  return MonitoredComponent
}

// Accessibility testing HOC
export const withAccessibilityTesting = (Component, options = {}) => {
  const AccessibilityTestedComponent = React.forwardRef((props, ref) => {
    const elementRef = React.useRef(null)
    const componentName = Component.displayName || Component.name || 'Component'
    
    React.useEffect(() => {
      if (process.env.NODE_ENV === 'development' && options.autoTest && elementRef.current) {
        const timer = setTimeout(() => {
          console.group(`♿ Testing ${componentName}`)
          
          const keyboardTest = AccessibilityTestUtils.testKeyboardNavigation(elementRef.current)
          console.log('Keyboard navigation:', keyboardTest)
          
          const contrastTest = AccessibilityTestUtils.testColorContrast(elementRef.current)
          if (contrastTest.length > 0) {
            console.warn('Color contrast issues:', contrastTest)
          }
          
          console.groupEnd()
        }, 1000)
        
        return () => clearTimeout(timer)
      }
    }, [])
    
    return (
      <div ref={elementRef}>
        <Component ref={ref} {...props} />
      </div>
    )
  })
  
  AccessibilityTestedComponent.displayName = `withAccessibilityTesting(${componentName})`
  
  return AccessibilityTestedComponent
}

 