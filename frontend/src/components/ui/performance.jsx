import * as React from "react"
import { cn } from "@/lib/utils"

// Virtual list component for large datasets
export const VirtualList = ({ 
  items, 
  renderItem, 
  itemHeight = 60, 
  containerHeight = 400,
  overscan = 5,
  className,
  ...props 
}) => {
  const [scrollTop, setScrollTop] = React.useState(0)
  const containerRef = React.useRef(null)
  
  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + overscan,
    items.length
  )
  
  const visibleItems = items.slice(visibleStart, visibleEnd)
  const totalHeight = items.length * itemHeight
  const offsetY = visibleStart * itemHeight
  
  const handleScroll = React.useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])
  
  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleStart + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [ref, setRef] = React.useState(null)
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  
  React.useEffect(() => {
    if (!ref) return
    
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)
    
    observer.observe(ref)
    
    return () => observer.disconnect()
  }, [ref, options])
  
  return [setRef, isIntersecting]
}

// Lazy loading component wrapper
export const LazyRender = ({ children, fallback = null, rootMargin = "100px" }) => {
  const [ref, isIntersecting] = useIntersectionObserver({ rootMargin })
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false)
  
  React.useEffect(() => {
    if (isIntersecting) {
      setHasBeenVisible(true)
    }
  }, [isIntersecting])
  
  return (
    <div ref={ref}>
      {hasBeenVisible ? children : fallback}
    </div>
  )
}

// Debounced input hook
export const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}

// Performance tracking hook
export const usePerformanceTracking = (componentName) => {
  const renderCountRef = React.useRef(0)
  const lastRenderTime = React.useRef(performance.now())
  
  React.useEffect(() => {
    renderCountRef.current += 1
    const currentTime = performance.now()
    const timeSinceLastRender = currentTime - lastRenderTime.current
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCountRef.current} times. Time since last render: ${timeSinceLastRender.toFixed(2)}ms`)
    }
    
    lastRenderTime.current = currentTime
  })
  
  return renderCountRef.current
}

// Memoized racing card for performance
export const MemoizedRacingCard = React.memo(({ 
  title, 
  value, 
  trend, 
  className,
  onClick,
  ...props 
}) => {
  return (
    <div
      className={cn(
        "p-6 rounded-lg border border-racing-red/30 bg-gradient-to-br from-racing-red/5 to-transparent",
        "hover:border-racing-red/50 transition-all duration-200 cursor-pointer",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-racing-red">{title}</h3>
        {trend && (
          <span className={cn(
            "text-sm font-medium",
            trend === "up" ? "text-neon-green" : trend === "down" ? "text-racing-red" : "text-muted-foreground"
          )}>
            {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.trend === nextProps.trend
  )
})
MemoizedRacingCard.displayName = "MemoizedRacingCard"

// Throttled scroll handler
export const useThrottledScroll = (callback, delay = 16) => {
  const lastRun = React.useRef(Date.now())
  
  return React.useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args)
      lastRun.current = Date.now()
    }
  }, [callback, delay])
}

// Image lazy loading with racing fallback
export const LazyImage = ({ 
  src, 
  alt, 
  fallback = null, 
  className,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = React.useState(null)
  const [error, setError] = React.useState(false)
  const [ref, isIntersecting] = useIntersectionObserver()
  
  React.useEffect(() => {
    if (isIntersecting && src && !imageSrc) {
      const img = new Image()
      img.onload = () => setImageSrc(src)
      img.onerror = () => setError(true)
      img.src = src
    }
  }, [isIntersecting, src, imageSrc])
  
  if (error) {
    return fallback || (
      <div className={cn(
        "flex items-center justify-center bg-racing-red/10 border border-racing-red/30 rounded",
        className
      )}>
        <span className="text-racing-red text-sm">Failed to load image</span>
      </div>
    )
  }
  
  return (
    <div ref={ref} className={className}>
      {imageSrc ? (
        <img src={imageSrc} alt={alt} className="w-full h-full object-cover" {...props} />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-racing-red/5 to-neon-blue/5 animate-pulse rounded" />
      )}
    </div>
  )
}

// Bundle size tracking (development only)
export const logBundleInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('Bundle Information')
    console.log('Loaded modules:', Object.keys(window.__webpack_require__.cache || {}).length)
    console.log('Chunk status:', window.__webpack_require__.cache ? 'Available' : 'Not available')
    console.groupEnd()
  }
}

// Resource hints for preloading
export const addResourceHints = (resources) => {
  resources.forEach(({ href, as, type = 'preload' }) => {
    const link = document.createElement('link')
    link.rel = type
    link.href = href
    if (as) link.as = as
    document.head.appendChild(link)
  })
}

// Critical CSS injection for racing theme
export const injectCriticalCSS = () => {
  const criticalCSS = `
    .racing-critical {
      --racing-red: 0 84% 60%;
      --neon-blue: 200 100% 60%;
      --carbon-fiber: 0 0% 8%;
    }
    .racing-gradient-critical {
      background: linear-gradient(135deg, hsl(var(--racing-red)), hsl(25 100% 60%));
    }
  `
  
  const style = document.createElement('style')
  style.textContent = criticalCSS
  document.head.appendChild(style)
}

 