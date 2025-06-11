import * as React from "react"
import { cn } from "@/lib/utils"

const DialogContext = React.createContext({})

const Dialog = ({ children, open, onOpenChange, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)
  
  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])
  
  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }
  
  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleOpenChange(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])
  
  return (
    <DialogContext.Provider value={{ isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef(({ className, children, asChild = false, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)
  
  const handleClick = () => {
    onOpenChange(true)
  }
  
  if (asChild) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
      ref,
    })
  }
  
  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

const DialogPortal = ({ children }) => {
  const { isOpen } = React.useContext(DialogContext)
  
  if (!isOpen) return null
  
  return (
    <>
      {typeof document !== 'undefined' &&
        React.createPortal(children, document.body)
      }
    </>
  )
}

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)
  
  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  )
})
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef(({ className, children, variant = "default", ...props }, ref) => {
  const contentRef = React.useRef(null)
  const { onOpenChange } = React.useContext(DialogContext)
  
  // Focus management
  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus()
    }
  }, [])
  
  const variants = {
    default: "bg-card text-card-foreground border-border",
    racing: "bg-card border-2 border-racing-red/30 shadow-2xl shadow-racing-red/20",
    dashboard: "bg-carbon border-2 border-dashboard/40 shadow-2xl shadow-dashboard/30",
    neon: "bg-card border-2 border-neon-blue/40 shadow-2xl shadow-neon-blue/30",
  }
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        ref={contentRef}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "rounded-lg sm:max-w-[425px]",
          variants[variant],
          className
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {children}
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close dialog"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </DialogPortal>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "text-lg font-semibold leading-none tracking-tight",
    racing: "text-lg font-bold text-transparent bg-racing-gradient bg-clip-text leading-none tracking-tight",
    dashboard: "text-lg font-semibold text-dashboard leading-none tracking-tight",
    neon: "text-lg font-semibold text-neon-blue leading-none tracking-tight",
  }
  
  return (
    <h2
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    />
  )
})
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

// Racing-themed confirmation dialog
const RacingDialog = ({ children, ...props }) => (
  <Dialog {...props}>
    <DialogContent variant="racing">
      {children}
    </DialogContent>
  </Dialog>
)

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  RacingDialog,
} 