import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './components/ThemeProvider'
import Layout from './components/Layout'
import { ErrorBoundary, DashboardErrorBoundary } from './components/ui/error-boundary'
import { RacingSpinner } from './components/ui'
import Analysis from './pages/Analysis'
import NotFound from './pages/NotFound'
import { LoginPage } from './pages/Auth/LoginPage'
import { SignUpPage } from './pages/Auth/SignUpPage'
import { RequestPasswordResetPage } from './pages/Auth/RequestPasswordResetPage'
import { UpdatePasswordPage } from './pages/Auth/UpdatePasswordPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProfilePage } from './pages/Profile/ProfilePage'

// Lazy load remaining components
const LazyDashboard = lazy(() => import('./pages/Dashboard'))
const LazyUpload = lazy(() => import('./pages/Upload'))
const LazyLogin = lazy(() => import('./pages/Login'))
const LazyNotFound = lazy(() => import('./pages/NotFound'))

const GlobalSuspenseFallback = () => (
  <div className="w-full h-screen flex items-center justify-center bg-background">
    <RacingSpinner size={100} />
  </div>
)

const UploadWithSuspense = () => (
  <Suspense fallback={<DashboardSuspenseFallback />}>
    <LazyUpload />
  </Suspense>
)

const AnalysisWithSuspense = () => (
  <Suspense fallback={<DashboardSuspenseFallback />}>
    <Analysis />
  </Suspense>
)

const DashboardSuspenseFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <RacingSpinner size={80} />
  </div>
)

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ErrorBoundary variant="racing" title="Application Error">
        <AuthProvider>
          <ThemeProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/request-password-reset" element={<RequestPasswordResetPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
              
              {/* Protected routes with layout */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={
                  <DashboardErrorBoundary>
                    <Suspense fallback={<DashboardSuspenseFallback />}>
                      <LazyDashboard />
                    </Suspense>
                  </DashboardErrorBoundary>
                } />
                <Route path="upload" element={
                  <ErrorBoundary variant="dashboard" title="Upload Page Error">
                    <UploadWithSuspense />
                  </ErrorBoundary>
                } />
                <Route path="analysis/:id" element={
                  <ErrorBoundary variant="dashboard" title="Analysis Page Error">
                    <AnalysisWithSuspense />
                  </ErrorBoundary>
                } />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={
                <Suspense fallback={<GlobalSuspenseFallback />}>
                  <LazyNotFound />
                </Suspense>
              } />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </div>
  )
}

export default App
