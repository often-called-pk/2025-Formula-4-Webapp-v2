import * as React from "react"
import { cn } from "@/lib/utils"

// Main dashboard grid container
const DashboardGrid = React.forwardRef(({ className, children, cols = "auto", gap = "default", ...props }, ref) => {
  const colVariants = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }
  
  const gapVariants = {
    none: "gap-0",
    sm: "gap-3",
    default: "gap-6",
    lg: "gap-8",
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "grid w-full",
        colVariants[cols],
        gapVariants[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DashboardGrid.displayName = "DashboardGrid"

// Grid item with span controls
const DashboardGridItem = React.forwardRef(({ className, span = 1, children, ...props }, ref) => {
  const spanVariants = {
    1: "col-span-1",
    2: "col-span-1 sm:col-span-2",
    3: "col-span-1 md:col-span-2 lg:col-span-3",
    4: "col-span-1 sm:col-span-2 xl:col-span-4",
    full: "col-span-full",
  }
  
  return (
    <div
      ref={ref}
      className={cn(spanVariants[span], className)}
      {...props}
    >
      {children}
    </div>
  )
})
DashboardGridItem.displayName = "DashboardGridItem"

// Racing-themed section header
const DashboardSection = React.forwardRef(({ className, title, subtitle, action, children, ...props }, ref) => {
  return (
    <section ref={ref} className={cn("space-y-6", className)} {...props}>
      {title && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-transparent bg-racing-gradient bg-clip-text">
              {title}
            </h2>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="flex items-center space-x-2">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  )
})
DashboardSection.displayName = "DashboardSection"

// Stats overview grid
const StatsGrid = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <DashboardGrid
      ref={ref}
      cols={4}
      gap="default"
      className={cn("mb-8", className)}
      {...props}
    >
      {children}
    </DashboardGrid>
  )
})
StatsGrid.displayName = "StatsGrid"

// Charts grid for larger visualizations
const ChartsGrid = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <DashboardGrid
      ref={ref}
      cols={2}
      gap="lg"
      className={cn("mb-8", className)}
      {...props}
    >
      {children}
    </DashboardGrid>
  )
})
ChartsGrid.displayName = "ChartsGrid"

// Responsive sidebar grid for detailed views
const SidebarGrid = React.forwardRef(({ className, children, sidebar, main, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-1 lg:grid-cols-4 gap-6",
        className
      )}
      {...props}
    >
      <div className="lg:col-span-3 space-y-6">
        {main}
      </div>
      <div className="space-y-6">
        {sidebar}
      </div>
      {children}
    </div>
  )
})
SidebarGrid.displayName = "SidebarGrid"

export {
  DashboardGrid,
  DashboardGridItem,
  DashboardSection,
  StatsGrid,
  ChartsGrid,
  SidebarGrid,
} 