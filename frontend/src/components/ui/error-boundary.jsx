import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

// Main error boundary class component
class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error, this.handleReset)
      ) : (
        <ErrorFallback 
          error={this.state.error}
          resetError={this.handleReset}
          variant={this.props.variant}
          title={this.props.title}
          description={this.props.description}
        />
      )
    }

    return this.props.children
  }
}

// Racing-themed error fallback component
const ErrorFallback = ({ 
  error, 
  resetError, 
  variant = "default", 
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  className,
  ...props 
}) => {
  const variants = {
    default: "border-destructive/20 bg-destructive/5",
    racing: "border-racing-red/30 bg-racing-red/5",
    dashboard: "border-dashboard/30 bg-dashboard/5",
    minimal: "border-border bg-card",
  }

  return (
    <Card className={cn(variants[variant], className)} {...props}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {variant === "racing" ? (
            <div className="w-16 h-16 rounded-full bg-racing-gradient flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          ) : variant === "dashboard" ? (
            <div className="w-16 h-16 rounded-full bg-dashboard/20 border border-dashboard/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-dashboard" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </div>
        
        <CardTitle variant={variant === "racing" ? "racing" : variant === "dashboard" ? "dashboard" : "default"}>
          {title}
        </CardTitle>
        
        <p className="text-muted-foreground mt-2">
          {description}
        </p>
      </CardHeader>
      
      <CardContent className="text-center space-y-4">
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left bg-muted/20 rounded p-4 text-sm">
            <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
            <pre className="whitespace-pre-wrap text-xs overflow-auto">
              {error.toString()}
            </pre>
          </details>
        )}
        
        <div className="flex justify-center space-x-3">
          <Button 
            onClick={resetError}
            variant={variant === "racing" ? "racing" : variant === "dashboard" ? "carbon" : "default"}
          >
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// HOC for wrapping components with error boundary
const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Main ErrorBoundary export
const ErrorBoundary = React.forwardRef((props, ref) => (
  <ErrorBoundaryClass ref={ref} {...props} />
))
ErrorBoundary.displayName = "ErrorBoundary"

// Chart error boundary specifically for data visualization
const ChartErrorBoundary = ({ children, title = "Chart Error", ...props }) => (
  <ErrorBoundary
    variant="dashboard"
    title={title}
    description="Unable to render chart data. Please check your data source and try again."
    {...props}
  >
    {children}
  </ErrorBoundary>
)

// Dashboard section error boundary
const DashboardErrorBoundary = ({ children, title = "Dashboard Error", ...props }) => (
  <ErrorBoundary
    variant="racing"
    title={title}
    description="A section of the dashboard failed to load. Other sections may still work normally."
    {...props}
  >
    {children}
  </ErrorBoundary>
)

// API error boundary for data fetching errors
const ApiErrorBoundary = ({ children, title = "Data Error", onRetry, ...props }) => (
  <ErrorBoundary
    variant="default"
    title={title}
    description="Failed to load data from the server. Please check your connection and try again."
    onReset={onRetry}
    {...props}
  >
    {children}
  </ErrorBoundary>
)

export {
  ErrorBoundary,
  ErrorFallback,
  ChartErrorBoundary,
  DashboardErrorBoundary,
  ApiErrorBoundary,
  withErrorBoundary,
} 