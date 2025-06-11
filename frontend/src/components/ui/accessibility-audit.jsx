import * as React from "react"
import { cn } from "@/lib/utils"

// Accessibility audit hook
export const useAccessibilityAudit = () => {
  const [auditResults, setAuditResults] = React.useState(null)
  const [isAuditing, setIsAuditing] = React.useState(false)
  
  const runAudit = React.useCallback(async (targetElement = document.body) => {
    setIsAuditing(true)
    
    const results = {
      timestamp: new Date().toISOString(),
      score: 0,
      issues: [],
      warnings: [],
      successes: [],
      recommendations: []
    }
    
    try {
      // Check for missing alt attributes
      const images = targetElement.querySelectorAll('img')
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
          results.issues.push({
            type: 'missing-alt',
            severity: 'high',
            element: `img[${index}]`,
            message: 'Image missing alt text',
            recommendation: 'Add descriptive alt text or aria-hidden="true" for decorative images'
          })
        } else if (img.alt) {
          results.successes.push({
            type: 'alt-text',
            element: `img[${index}]`,
            message: 'Image has alt text'
          })
        }
      })
      
      // Check for proper heading hierarchy
      const headings = targetElement.querySelectorAll('h1, h2, h3, h4, h5, h6')
      let previousLevel = 0
      headings.forEach((heading, index) => {
        const currentLevel = parseInt(heading.tagName.charAt(1))
        if (currentLevel > previousLevel + 1) {
          results.issues.push({
            type: 'heading-hierarchy',
            severity: 'medium',
            element: `${heading.tagName.toLowerCase()}[${index}]`,
            message: `Heading level skipped from h${previousLevel} to h${currentLevel}`,
            recommendation: 'Use proper heading hierarchy without skipping levels'
          })
        }
        previousLevel = currentLevel
      })
      
      // Check for proper ARIA labels on interactive elements
      const interactiveElements = targetElement.querySelectorAll(
        'button, [role="button"], [tabindex]:not([tabindex="-1"]), input, select, textarea'
      )
      interactiveElements.forEach((element, index) => {
        const hasLabel = element.getAttribute('aria-label') || 
                        element.getAttribute('aria-labelledby') || 
                        element.querySelector('label') ||
                        element.textContent.trim()
        
        if (!hasLabel) {
          results.issues.push({
            type: 'missing-label',
            severity: 'high',
            element: `${element.tagName.toLowerCase()}[${index}]`,
            message: 'Interactive element missing accessible label',
            recommendation: 'Add aria-label, aria-labelledby, or visible text content'
          })
        } else {
          results.successes.push({
            type: 'accessible-label',
            element: `${element.tagName.toLowerCase()}[${index}]`,
            message: 'Interactive element has accessible label'
          })
        }
      })
      
      // Check for sufficient color contrast (simplified)
      const elementsWithText = targetElement.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a')
      elementsWithText.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element)
        const color = computedStyle.color
        const backgroundColor = computedStyle.backgroundColor
        
        // Basic check for very light text on light backgrounds or dark on dark
        if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          // This is a simplified check - in production, use a proper contrast calculation
          const isLightText = color.includes('255') || color.includes('white')
          const isLightBackground = backgroundColor.includes('255') || backgroundColor.includes('white')
          
          if ((isLightText && isLightBackground) || (!isLightText && !isLightBackground)) {
            results.warnings.push({
              type: 'color-contrast',
              severity: 'medium',
              element: `${element.tagName.toLowerCase()}[${index}]`,
              message: 'Potential color contrast issue detected',
              recommendation: 'Verify color contrast meets WCAG AA standards (4.5:1 ratio)'
            })
          }
        }
      })
      
      // Check for keyboard accessibility
      const focusableElements = targetElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      focusableElements.forEach((element, index) => {
        if (element.tabIndex === -1 && !element.getAttribute('aria-hidden')) {
          results.warnings.push({
            type: 'keyboard-access',
            severity: 'medium',
            element: `${element.tagName.toLowerCase()}[${index}]`,
            message: 'Element not keyboard accessible',
            recommendation: 'Ensure element can be focused and activated via keyboard'
          })
        }
      })
      
      // Check for proper landmark roles
      const landmarks = targetElement.querySelectorAll('[role="main"], [role="banner"], [role="navigation"], [role="contentinfo"], main, header, nav, footer')
      if (landmarks.length === 0) {
        results.issues.push({
          type: 'missing-landmarks',
          severity: 'medium',
          element: 'document',
          message: 'No landmark elements found',
          recommendation: 'Add semantic HTML5 elements or ARIA landmark roles'
        })
      } else {
        results.successes.push({
          type: 'landmarks',
          element: 'document',
          message: `Found ${landmarks.length} landmark elements`
        })
      }
      
      // Check for form labels
      const formInputs = targetElement.querySelectorAll('input, select, textarea')
      formInputs.forEach((input, index) => {
        const hasLabel = input.labels?.length > 0 || 
                        input.getAttribute('aria-label') || 
                        input.getAttribute('aria-labelledby')
        
        if (!hasLabel) {
          results.issues.push({
            type: 'form-label',
            severity: 'high',
            element: `${input.tagName.toLowerCase()}[${index}]`,
            message: 'Form input missing label',
            recommendation: 'Associate input with a label element or add aria-label'
          })
        }
      })
      
      // Calculate overall score
      const totalChecks = results.issues.length + results.warnings.length + results.successes.length
      const successRate = totalChecks > 0 ? (results.successes.length / totalChecks) * 100 : 100
      results.score = Math.round(successRate)
      
      // Add general recommendations
      results.recommendations = [
        'Use semantic HTML elements (header, nav, main, section, article, footer)',
        'Ensure all interactive elements are keyboard accessible',
        'Provide alternative text for all informative images',
        'Maintain proper heading hierarchy (h1 → h2 → h3)',
        'Use sufficient color contrast (4.5:1 ratio for normal text)',
        'Test with screen readers and keyboard-only navigation',
        'Add skip links for keyboard users',
        'Use ARIA attributes appropriately to enhance semantics'
      ]
      
    } catch (error) {
      console.error('Accessibility audit error:', error)
      results.issues.push({
        type: 'audit-error',
        severity: 'high',
        element: 'audit-system',
        message: 'Error during accessibility audit',
        recommendation: 'Check console for details'
      })
    }
    
    setAuditResults(results)
    setIsAuditing(false)
    
    return results
  }, [])
  
  return {
    auditResults,
    isAuditing,
    runAudit
  }
}

// Accessibility audit report component
export const AccessibilityAuditReport = ({ results, className, onClose }) => {
  if (!results) return null
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }
  
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return '❌'
      case 'medium': return '⚠️'
      case 'low': return 'ℹ️'
      default: return '📋'
    }
  }
  
  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4",
      className
    )}>
      <div className="bg-card border border-racing-red/30 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-racing-red/30 bg-racing-red/5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-racing-red">
              Accessibility Audit Report
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close audit report"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Generated: {new Date(results.timestamp).toLocaleString()}
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              results.score >= 80 ? "bg-green-100 text-green-800" :
              results.score >= 60 ? "bg-yellow-100 text-yellow-800" :
              "bg-red-100 text-red-800"
            )}>
              Score: {results.score}%
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="text-2xl font-bold text-red-600">{results.issues.length}</div>
              <div className="text-sm text-red-700">Issues</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{results.warnings.length}</div>
              <div className="text-sm text-yellow-700">Warnings</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="text-2xl font-bold text-green-600">{results.successes.length}</div>
              <div className="text-sm text-green-700">Passed</div>
            </div>
          </div>
          
          {results.issues.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-red-600 mb-3">Issues</h3>
              <div className="space-y-3">
                {results.issues.map((issue, index) => (
                  <div key={index} className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-start">
                      <span className="mr-2">{getSeverityIcon(issue.severity)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-red-800">{issue.message}</div>
                        <div className="text-sm text-red-600 mt-1">Element: {issue.element}</div>
                        <div className="text-sm text-red-700 mt-2">{issue.recommendation}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {results.warnings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-3">Warnings</h3>
              <div className="space-y-3">
                {results.warnings.map((warning, index) => (
                  <div key={index} className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="flex items-start">
                      <span className="mr-2">{getSeverityIcon(warning.severity)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-yellow-800">{warning.message}</div>
                        <div className="text-sm text-yellow-600 mt-1">Element: {warning.element}</div>
                        <div className="text-sm text-yellow-700 mt-2">{warning.recommendation}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-racing-red mb-3">Recommendations</h3>
            <ul className="space-y-2">
              {results.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 text-racing-red">•</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Accessibility testing utilities
export const AccessibilityTestUtils = {
  // Test keyboard navigation
  testKeyboardNavigation: async (element) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    let passedTests = 0
    let totalTests = focusableElements.length
    
    for (let i = 0; i < focusableElements.length; i++) {
      const el = focusableElements[i]
      try {
        el.focus()
        if (document.activeElement === el) {
          passedTests++
        }
      } catch (error) {
        console.warn('Focus test failed for element:', el, error)
      }
    }
    
    return {
      passed: passedTests,
      total: totalTests,
      percentage: totalTests > 0 ? (passedTests / totalTests) * 100 : 100
    }
  },
  
  // Test screen reader announcements
  testScreenReaderAnnouncements: (element) => {
    const ariaLiveElements = element.querySelectorAll('[aria-live]')
    const announcements = []
    
    ariaLiveElements.forEach(el => {
      announcements.push({
        element: el.tagName.toLowerCase(),
        politeness: el.getAttribute('aria-live'),
        content: el.textContent
      })
    })
    
    return announcements
  },
  
  // Test color contrast
  testColorContrast: (element) => {
    const textElements = element.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a')
    const contrastIssues = []
    
    textElements.forEach((el, index) => {
      const style = window.getComputedStyle(el)
      const color = style.color
      const backgroundColor = style.backgroundColor
      
      if (color && backgroundColor) {
        // Simplified contrast check
        const colorValues = color.match(/\d+/g)
        const bgValues = backgroundColor.match(/\d+/g)
        
        if (colorValues && bgValues) {
          const [r1, g1, b1] = colorValues.map(Number)
          const [r2, g2, b2] = bgValues.map(Number)
          
          // Simple luminance calculation
          const l1 = (0.299 * r1 + 0.587 * g1 + 0.114 * b1) / 255
          const l2 = (0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255
          
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
          
          if (ratio < 4.5) {
            contrastIssues.push({
              element: `${el.tagName.toLowerCase()}[${index}]`,
              ratio: ratio.toFixed(2),
              color,
              backgroundColor
            })
          }
        }
      }
    })
    
    return contrastIssues
  }
}

// Racing-themed accessibility status indicator
export const AccessibilityStatusIndicator = ({ score, size = "md", className }) => {
  const getStatusColor = (score) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }
  
  const getStatusIcon = (score) => {
    if (score >= 80) return "✅"
    if (score >= 60) return "⚠️"
    return "❌"
  }
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }
  
  return (
    <div className={cn(
      "inline-flex items-center space-x-2 px-3 py-1 rounded-full border",
      "bg-card border-racing-red/30",
      sizeClasses[size],
      className
    )}>
      <span>{getStatusIcon(score)}</span>
      <span className={getStatusColor(score)}>
        A11y: {score}%
      </span>
    </div>
  )
}

 