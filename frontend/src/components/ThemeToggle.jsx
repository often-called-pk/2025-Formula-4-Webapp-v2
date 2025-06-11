import { useTheme } from './ThemeProvider'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className, ...props }) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'relative overflow-hidden',
        className
      )}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      {...props}
    >
      {/* Racing-themed icons with neon effect */}
      <div className="relative w-5 h-5">
        {/* Sun icon for light mode */}
        <svg
          className={cn(
            'absolute inset-0 w-5 h-5 transition-all duration-300 transform',
            theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        
        {/* Moon icon for dark mode with neon glow */}
        <svg
          className={cn(
            'absolute inset-0 w-5 h-5 transition-all duration-300 transform',
            'text-neon-blue',
            theme === 'dark' ? 'rotate-0 scale-100 opacity-100 drop-shadow-[0_0_8px_hsl(var(--neon-blue))]' : '-rotate-90 scale-0 opacity-0'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
      
      <span className="sr-only">Toggle theme</span>
    </button>
  )
} 