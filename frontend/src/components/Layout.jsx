import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './ThemeToggle'

const Layout = () => {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '🏁' },
    { name: 'Upload', href: '/upload', icon: '📊' },
    { name: 'Analysis', href: '/analysis', icon: '⚡' },
  ]

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border relative overflow-hidden transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Racing gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-racing-red/10 via-transparent to-neon-blue/10 pointer-events-none" />
        
        <div className="flex h-full flex-col relative z-10">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center px-6 border-b border-border/50">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-racing-gradient flex items-center justify-center">
                <span className="text-white font-bold text-sm">F4</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  Formula 4
                </h1>
                <p className="text-xs text-muted-foreground leading-tight">
                  Analytics
                </p>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button
              onClick={closeSidebar}
              className="lg:hidden ml-auto p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col px-4 py-6" role="navigation" aria-label="Main navigation">
            <ul className="space-y-3">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={closeSidebar}
                    className={cn(
                      'flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                      'border border-transparent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      location.pathname === item.href
                        ? 'bg-racing-gradient text-white shadow-lg shadow-racing-red/20 border-racing-red/30'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:border-neon-blue/30 hover:shadow-sm'
                    )}
                    aria-current={location.pathname === item.href ? 'page' : undefined}
                  >
                    <span className="mr-3 text-lg" aria-hidden="true">{item.icon}</span>
                    <span>{item.name}</span>
                    {location.pathname === item.href && (
                      <div className="ml-auto w-2 h-2 bg-neon-blue rounded-full animate-pulse-glow" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Racing info panel */}
          <div className="p-4 m-4 rounded-lg bg-carbon border border-dashboard/30" role="status" aria-label="System status">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-dashboard">SYSTEM STATUS</span>
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Engine</span>
                <span className="text-neon-green">ONLINE</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Telemetry</span>
                <span className="text-neon-blue">READY</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-4 relative">
          {/* Subtle racing glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-blue/5 to-transparent" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Open sidebar"
                aria-expanded={sidebarOpen}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                {navigation.find(item => item.href === location.pathname)?.name || 'Formula 4 Analytics'}
              </h2>
              <div className="hidden md:flex items-center space-x-2 text-xs text-muted-foreground">
                <span>•</span>
                <span>Real-time telemetry analysis</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" aria-hidden="true" />
                  <span>Live</span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gradient-to-br from-background via-background to-background/95" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout 