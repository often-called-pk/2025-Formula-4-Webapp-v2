import * as React from "react"
import { cn } from "@/lib/utils"

// Base skeleton component
const Skeleton = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className
      )}
      {...props}
    />
  )
})
Skeleton.displayName = "Skeleton"

// Racing-themed skeleton with glow effect
const RacingSkeleton = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "animate-pulse rounded-md bg-gradient-to-r from-muted/30 via-racing-red/10 to-muted/30 bg-size-200 animate-[pulse_2s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  )
})
RacingSkeleton.displayName = "RacingSkeleton"

// Card skeleton for dashboard cards
const CardSkeleton = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const SkeletonComponent = variant === "racing" ? RacingSkeleton : Skeleton
  
  return (
    <div ref={ref} className={cn("rounded-lg border p-6 space-y-4", className)} {...props}>
      {/* Header */}
      <div className="space-y-2">
        <SkeletonComponent className="h-4 w-1/3" />
        <SkeletonComponent className="h-6 w-1/2" />
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <SkeletonComponent className="h-3 w-full" />
        <SkeletonComponent className="h-3 w-4/5" />
        <SkeletonComponent className="h-3 w-3/5" />
      </div>
    </div>
  )
})
CardSkeleton.displayName = "CardSkeleton"

// Metric card skeleton
const MetricSkeleton = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const SkeletonComponent = variant === "racing" ? RacingSkeleton : Skeleton
  
  return (
    <div ref={ref} className={cn("rounded-lg border p-6 space-y-4", className)} {...props}>
      {/* Title and trend */}
      <div className="flex items-center justify-between">
        <SkeletonComponent className="h-4 w-1/2" />
        <SkeletonComponent className="h-4 w-8" />
      </div>
      
      {/* Value */}
      <SkeletonComponent className="h-8 w-3/4" />
    </div>
  )
})
MetricSkeleton.displayName = "MetricSkeleton"

// Chart skeleton
const ChartSkeleton = React.forwardRef(({ className, variant = "default", height = "h-64", ...props }, ref) => {
  const SkeletonComponent = variant === "racing" ? RacingSkeleton : Skeleton
  
  return (
    <div ref={ref} className={cn("rounded-lg border p-6 space-y-4", className)} {...props}>
      {/* Chart header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonComponent className="h-5 w-32" />
          <SkeletonComponent className="h-3 w-48" />
        </div>
        <SkeletonComponent className="h-8 w-20" />
      </div>
      
      {/* Chart area */}
      <SkeletonComponent className={cn("w-full", height)} />
      
      {/* Legend */}
      <div className="flex items-center space-x-4">
        <SkeletonComponent className="h-3 w-16" />
        <SkeletonComponent className="h-3 w-20" />
        <SkeletonComponent className="h-3 w-18" />
      </div>
    </div>
  )
})
ChartSkeleton.displayName = "ChartSkeleton"

// Table skeleton
const TableSkeleton = React.forwardRef(({ className, rows = 5, cols = 4, variant = "default", ...props }, ref) => {
  const SkeletonComponent = variant === "racing" ? RacingSkeleton : Skeleton
  
  return (
    <div ref={ref} className={cn("rounded-lg border", className)} {...props}>
      {/* Table header */}
      <div className="border-b p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonComponent key={i} className="h-4 w-3/4" />
          ))}
        </div>
      </div>
      
      {/* Table rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <SkeletonComponent key={colIndex} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
TableSkeleton.displayName = "TableSkeleton"

// Dashboard skeleton - full page loading
const DashboardSkeleton = ({ variant = "default" }) => {
  const SkeletonComponent = variant === "racing" ? RacingSkeleton : Skeleton
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonComponent className="h-8 w-64" />
        <SkeletonComponent className="h-4 w-96" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricSkeleton key={i} variant={variant} />
        ))}
      </div>
      
      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <ChartSkeleton key={i} variant={variant} />
        ))}
      </div>
      
      {/* Table */}
      <TableSkeleton variant={variant} />
    </div>
  )
}

// Loading text with racing animation
const LoadingText = ({ children = "Loading...", variant = "default", className, ...props }) => {
  const variants = {
    default: "text-muted-foreground",
    racing: "text-transparent bg-racing-gradient bg-clip-text",
    neon: "text-neon-blue",
  }
  
  return (
    <div className={cn("flex items-center space-x-2", className)} {...props}>
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <span className={cn("animate-pulse", variants[variant])}>
        {children}
      </span>
    </div>
  )
}

export {
  Skeleton,
  RacingSkeleton,
  CardSkeleton,
  MetricSkeleton,
  ChartSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  LoadingText,
} 