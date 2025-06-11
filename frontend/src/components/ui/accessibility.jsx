import * as React from "react"
import { cn } from "@/lib/utils"

// Focus management hook
export const useFocusManagement = (enabled = true) => {
  const previousFocus = React.useRef(null)
  const containerRef = React.useRef(null)
  
  const trapFocus = React.useCallback(() => {
    if (!enabled || !containerRef.current) return
    
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }
    
    containerRef.current.addEventListener('keydown', handleKeyDown)
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [enabled])
  
  const setFocus = React.useCallback((element) => {
    if (enabled && element) {
      previousFocus.current = document.activeElement
      element.focus()
    }
  }, [enabled])
  
  const restoreFocus = React.useCallback(() => {
    if (enabled && previousFocus.current) {
      previousFocus.current.focus()
      previousFocus.current = null
    }
  }, [enabled])
  
  React.useEffect(() => {
    return trapFocus()
  }, [trapFocus])
  
  return {
    containerRef,
    setFocus,
    restoreFocus,
    trapFocus
  }
}

// Keyboard navigation hook
export const useKeyboardNavigation = (options = {}) => {
  const {
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onSpace,
    enabled = true
  } = options
  
  const handleKeyDown = React.useCallback((e) => {
    if (!enabled) return
    
    switch (e.key) {
      case 'Enter':
        if (onEnter) {
          e.preventDefault()
          onEnter(e)
        }
        break
      case 'Escape':
        if (onEscape) {
          e.preventDefault()
          onEscape(e)
        }
        break
      case 'ArrowUp':
        if (onArrowUp) {
          e.preventDefault()
          onArrowUp(e)
        }
        break
      case 'ArrowDown':
        if (onArrowDown) {
          e.preventDefault()
          onArrowDown(e)
        }
        break
      case 'ArrowLeft':
        if (onArrowLeft) {
          e.preventDefault()
          onArrowLeft(e)
        }
        break
      case 'ArrowRight':
        if (onArrowRight) {
          e.preventDefault()
          onArrowRight(e)
        }
        break
      case ' ':
        if (onSpace) {
          e.preventDefault()
          onSpace(e)
        }
        break
    }
  }, [enabled, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onSpace])
  
  return { handleKeyDown }
}

// Screen reader announcements
export const useScreenReaderAnnouncement = () => {
  const announcementRef = React.useRef(null)
  
  const announce = React.useCallback((message, priority = 'polite') => {
    if (!announcementRef.current) {
      const element = document.createElement('div')
      element.setAttribute('aria-live', priority)
      element.setAttribute('aria-atomic', 'true')
      element.className = 'sr-only'
      document.body.appendChild(element)
      announcementRef.current = element
    }
    
    // Clear previous message
    announcementRef.current.textContent = ''
    
    // Add new message with small delay to ensure it's announced
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message
      }
    }, 100)
  }, [])
  
  React.useEffect(() => {
    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current)
      }
    }
  }, [])
  
  return { announce }
}

// Racing-themed accessible skip links
export const SkipLink = ({ href, children, className, ...props }) => (
  <a
    href={href}
    className={cn(
      "absolute left-0 top-0 z-[9999] -translate-y-full transform",
      "px-4 py-2 text-sm font-medium text-white",
      "bg-racing-gradient border border-racing-red",
      "focus:translate-y-0 focus:ring-2 focus:ring-racing-red focus:ring-offset-2",
      "transition-transform duration-200",
      className
    )}
    {...props}
  >
    {children}
  </a>
)

// Accessible racing card with proper ARIA attributes
export const AccessibleRacingCard = React.forwardRef(({
  title,
  description,
  value,
  trend,
  interactive = false,
  ariaLabel,
  className,
  onClick,
  ...props
}, ref) => {
  const cardId = React.useId()
  const titleId = `${cardId}-title`
  const descId = `${cardId}-desc`
  
  return (
    <div
      ref={ref}
      className={cn(
        "p-6 rounded-lg border border-racing-red/30 bg-gradient-to-br from-racing-red/5 to-transparent",
        "hover:border-racing-red/50 transition-all duration-200",
        interactive && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-racing-red focus:ring-offset-2",
        className
      )}
      role={interactive ? "button" : "article"}
      tabIndex={interactive ? 0 : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      aria-label={ariaLabel}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(e)
        }
      } : undefined}
      {...props}
    >
      <div className="flex items-center justify-between">
        <h3 id={titleId} className="text-lg font-semibold text-racing-red">
          {title}
        </h3>
        {trend && (
          <span 
            className={cn(
              "text-sm font-medium",
              trend === "up" ? "text-neon-green" : trend === "down" ? "text-racing-red" : "text-muted-foreground"
            )}
            aria-label={`Trend: ${trend === "up" ? "increasing" : trend === "down" ? "decreasing" : "stable"}`}
          >
            {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
          </span>
        )}
      </div>
      {description && (
        <p id={descId} className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-2 text-2xl font-bold" aria-label={`Value: ${value}`}>
        {value}
      </div>
    </div>
  )
})
AccessibleRacingCard.displayName = "AccessibleRacingCard"

// Color contrast checker for racing theme
export const useColorContrast = () => {
  const checkContrast = React.useCallback((foreground, background) => {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd want a more robust color parser
    const getLuminance = (color) => {
      // Basic luminance calculation for hex colors
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) / 255
      const g = parseInt(hex.substr(2, 2), 16) / 255
      const b = parseInt(hex.substr(4, 2), 16) / 255
      
      const [rs, gs, bs] = [r, g, b].map(c => 
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      )
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
    }
    
    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const brightest = Math.max(l1, l2)
    const darkest = Math.min(l1, l2)
    
    return (brightest + 0.05) / (darkest + 0.05)
  }, [])
  
  const isAccessible = React.useCallback((foreground, background, level = 'AA') => {
    const ratio = checkContrast(foreground, background)
    return level === 'AAA' ? ratio >= 7 : ratio >= 4.5
  }, [checkContrast])
  
  return { checkContrast, isAccessible }
}

// Accessible form validation
export const useAccessibleForm = () => {
  const [errors, setErrors] = React.useState({})
  const { announce } = useScreenReaderAnnouncement()
  
  const setFieldError = React.useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }))
    
    if (error) {
      announce(`Error in ${fieldName}: ${error}`, 'assertive')
    }
  }, [announce])
  
  const clearFieldError = React.useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])
  
  const getFieldProps = React.useCallback((fieldName) => {
    const hasError = !!errors[fieldName]
    const errorId = hasError ? `${fieldName}-error` : undefined
    
    return {
      'aria-invalid': hasError,
      'aria-describedby': errorId,
      id: fieldName
    }
  }, [errors])
  
  const getErrorProps = React.useCallback((fieldName) => {
    const hasError = !!errors[fieldName]
    
    return hasError ? {
      id: `${fieldName}-error`,
      role: 'alert',
      className: 'text-sm text-racing-red mt-1'
    } : null
  }, [errors])
  
  return {
    errors,
    setFieldError,
    clearFieldError,
    getFieldProps,
    getErrorProps
  }
}

// Accessible racing progress indicator
export const AccessibleRacingProgress = ({ 
  value, 
  max = 100, 
  label,
  showPercentage = true,
  className,
  ...props 
}) => {
  const percentage = Math.round((value / max) * 100)
  const progressId = React.useId()
  
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={progressId} className="text-sm font-medium">
          {label}
        </label>
        {showPercentage && (
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            {percentage}%
          </span>
        )}
      </div>
      <div 
        className="w-full h-2 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${percentage}% complete`}
      >
        <div
          id={progressId}
          className="h-full bg-racing-gradient transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="sr-only" aria-live="polite">
        {label} progress: {percentage}% complete
      </div>
    </div>
  )
}

// Accessible racing data table
export const AccessibleRacingTable = ({ 
  caption, 
  headers, 
  data, 
  sortable = false,
  className,
  ...props 
}) => {
  const tableId = React.useId()
  const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' })
  
  const handleSort = React.useCallback((key) => {
    if (!sortable) return
    
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [sortable])
  
  return (
    <div className="overflow-x-auto">
      <table 
        id={tableId}
        className={cn(
          "w-full border-collapse border border-racing-red/30",
          "bg-card text-card-foreground",
          className
        )}
        {...props}
      >
        {caption && (
          <caption className="sr-only">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="border-b border-racing-red/30 bg-racing-red/5">
            {headers.map((header, index) => (
              <th
                key={index}
                className={cn(
                  "px-4 py-3 text-left font-semibold text-racing-red",
                  sortable && "cursor-pointer hover:bg-racing-red/10"
                )}
                onClick={sortable ? () => handleSort(header.key || header) : undefined}
                onKeyDown={sortable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort(header.key || header)
                  }
                } : undefined}
                tabIndex={sortable ? 0 : undefined}
                aria-sort={
                  sortable && sortConfig.key === (header.key || header)
                    ? sortConfig.direction === 'asc' ? 'ascending' : 'descending'
                    : 'none'
                }
              >
                {header.label || header}
                {sortable && sortConfig.key === (header.key || header) && (
                  <span className="ml-2" aria-hidden="true">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex}
              className="border-b border-racing-red/20 hover:bg-racing-red/5"
            >
              {headers.map((header, colIndex) => (
                <td
                  key={colIndex}
                  className="px-4 py-3"
                >
                  {row[header.key || header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

 