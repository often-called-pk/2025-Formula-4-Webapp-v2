import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-card text-card-foreground border-border",
    racing: "bg-card border-racing-red/30 shadow-lg shadow-racing-red/10 relative overflow-hidden",
    dashboard: "bg-carbon border border-dashboard/30 shadow-md shadow-dashboard/20",
    neon: "bg-card border-neon-blue/40 shadow-md shadow-neon-blue/20",
    data: "bg-card/50 backdrop-blur border-border/50",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border shadow-sm transition-all duration-200",
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "text-2xl font-semibold leading-none tracking-tight",
    racing: "text-2xl font-bold text-transparent bg-racing-gradient bg-clip-text leading-none tracking-tight",
    dashboard: "text-xl font-semibold text-dashboard leading-none tracking-tight",
    neon: "text-xl font-semibold text-neon-blue leading-none tracking-tight",
  }

  return (
    <h3
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Racing-specific Card variant with gradient overlay
const RacingCard = React.forwardRef(({ className, children, ...props }, ref) => (
  <Card
    ref={ref}
    variant="racing"
    className={cn("relative", className)}
    {...props}
  >
    {/* Gradient overlay for racing effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-racing-red/5 via-transparent to-neon-blue/5 pointer-events-none rounded-lg" />
    <div className="relative z-10">
      {children}
    </div>
  </Card>
))
RacingCard.displayName = "RacingCard"

// Dashboard stats card
const DashboardCard = React.forwardRef(({ className, children, glowing = false, ...props }, ref) => (
  <Card
    ref={ref}
    variant="dashboard"
    className={cn(
      glowing && "animate-pulse-glow",
      className
    )}
    {...props}
  >
    {children}
  </Card>
))
DashboardCard.displayName = "DashboardCard"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  RacingCard,
  DashboardCard,
} 