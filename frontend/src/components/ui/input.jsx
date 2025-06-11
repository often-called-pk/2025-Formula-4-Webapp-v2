import * as React from "react"
import { cn } from "@/lib/utils"

const inputVariants = {
  variant: {
    default: "border-input bg-background text-foreground",
    racing: "border-racing-red/30 bg-background text-foreground focus:border-racing-red/60 focus:shadow-md focus:shadow-racing-red/20",
    dashboard: "border-dashboard/30 bg-carbon text-dashboard focus:border-dashboard/60 focus:shadow-md focus:shadow-dashboard/30",
    neon: "border-neon-blue/30 bg-background text-foreground focus:border-neon-blue/60 focus:shadow-md focus:shadow-neon-blue/20",
    ghost: "border-transparent bg-background/50 text-foreground focus:border-border focus:bg-background",
  },
  size: {
    default: "h-10 px-3 py-2",
    sm: "h-9 px-3 py-2 text-sm",
    lg: "h-11 px-4 py-2",
  },
}

const Input = React.forwardRef(({ className, type, variant = "default", size = "default", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex w-full rounded-md border text-sm ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        inputVariants.variant[variant],
        inputVariants.size[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

// Racing-themed search input with icon
const SearchInput = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <Input
        ref={ref}
        className={cn("pl-10", className)}
        variant="racing"
        {...props}
      />
    </div>
  )
})
SearchInput.displayName = "SearchInput"

// File input with racing styling
const FileInput = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <Input
        ref={ref}
        type="file"
        className={cn(
          "file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-racing-gradient file:text-white hover:file:opacity-90",
          className
        )}
        variant="racing"
        {...props}
      />
    </div>
  )
})
FileInput.displayName = "FileInput"

// Textarea component with racing theme
const Textarea = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2",
        inputVariants.variant[variant],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Input, SearchInput, FileInput, Textarea, inputVariants } 