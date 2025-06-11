import React from 'react'
import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold mt-4">Page Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The page you are looking for does not exist.
          </p>
        </div>
        
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFound 