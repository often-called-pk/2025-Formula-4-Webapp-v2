import * as React from "react"
import { cn } from "@/lib/utils"

// Status indicator with racing colors
const StatusIndicator = ({ status = "online", className, children, ...props }) => {
  const statusColors = {
    online: "bg-neon-green text-black",
    offline: "bg-muted text-muted-foreground",
    warning: "bg-racing-yellow text-black",
    error: "bg-racing-red text-white",
    processing: "bg-neon-blue text-black animate-pulse",
  }
  
  return (
    <div
      className={cn(
        "inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200",
        statusColors[status],
        className
      )}
      {...props}
    >
      <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
      <span>{children || status.toUpperCase()}</span>
    </div>
  )
}

// Racing-themed data display
const DataDisplay = ({ label, value, unit, variant = "default", className, ...props }) => {
  const variants = {
    default: "text-foreground",
    racing: "text-racing-red font-bold",
    neon: "text-neon-blue font-bold",
    dashboard: "text-dashboard font-semibold",
    success: "text-neon-green font-semibold",
    warning: "text-racing-yellow font-semibold",
  }
  
  return (
    <div className={cn("flex flex-col space-y-1", className)} {...props}>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-baseline space-x-1">
        <span className={cn("text-2xl font-mono", variants[variant])}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  )
}

// Progress bar with racing styling
const RacingProgress = ({ value = 0, max = 100, variant = "racing", className, ...props }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const variants = {
    racing: "bg-racing-gradient",
    neon: "bg-neon-blue",
    dashboard: "bg-dashboard",
    success: "bg-neon-green",
    warning: "bg-racing-yellow",
  }
  
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full transition-all duration-500 ease-out",
          variants[variant]
        )}
        style={{ width: `${percentage}%` }}
      />
      {variant === "racing" && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      )}
    </div>
  )
}

// Metric card with racing theme
const MetricCard = ({ title, value, unit, change, trend, variant = "default", className, ...props }) => {
  const trendColors = {
    up: "text-neon-green",
    down: "text-racing-red",
    neutral: "text-muted-foreground",
  }
  
  const variants = {
    default: "border-border",
    racing: "border-racing-red/30 bg-gradient-to-br from-racing-red/5 to-transparent",
    neon: "border-neon-blue/30 bg-gradient-to-br from-neon-blue/5 to-transparent",
    dashboard: "border-dashboard/30 bg-gradient-to-br from-dashboard/5 to-transparent",
  }
  
  const TrendIcon = () => {
    if (trend === "up") {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7h-10" />
        </svg>
      )
    }
    if (trend === "down") {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
        </svg>
      )
    }
    return null
  }
  
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 transition-all duration-200 hover:shadow-md",
        variants[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {change && trend && (
          <div className={cn("flex items-center space-x-1 text-sm", trendColors[trend])}>
            <TrendIcon />
            <span>{change}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline space-x-2">
        <div className="text-2xl font-bold">{value}</div>
        {unit && <div className="text-sm text-muted-foreground">{unit}</div>}
      </div>
    </div>
  )
}

// Loading spinner with racing theme
const RacingSpinner = ({ size = "default", variant = "racing", className, ...props }) => {
  const sizes = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  }
  
  const variants = {
    racing: "text-racing-red",
    neon: "text-neon-blue",
    dashboard: "text-dashboard",
  }
  
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

// Racing-themed badge
const RacingBadge = ({ children, variant = "racing", size = "default", className, ...props }) => {
  const variants = {
    racing: "bg-racing-gradient text-white",
    neon: "bg-neon-blue text-black",
    dashboard: "bg-dashboard text-black",
    outline: "border border-racing-red text-racing-red",
    success: "bg-neon-green text-black",
    warning: "bg-racing-yellow text-black",
  }
  
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    default: "px-2.5 py-0.5 text-sm",
    lg: "px-3 py-1 text-sm",
  }
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold transition-all duration-200",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export {
  StatusIndicator,
  DataDisplay,
  RacingProgress,
  MetricCard,
  RacingSpinner,
  RacingBadge,
} 