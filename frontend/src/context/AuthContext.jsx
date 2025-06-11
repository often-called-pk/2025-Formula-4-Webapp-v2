// Formula 4 Race Analytics 2025 - Authentication Context
// This context manages user authentication state throughout the application

import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  supabase, 
  getCurrentUser, 
  getCurrentSession,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  signInWithMagicLink as supabaseMagicLink,
  resetPassword as supabaseResetPassword,
  updatePassword as supabaseUpdatePassword,
  getUserProfile,
  updateUserProfile,
  onAuthStateChange,
  parseErrorMessage
} from '@/lib/supabase'

// Create the authentication context
const AuthContext = createContext({
  // Authentication state
  user: null,
  session: null,
  profile: null,
  loading: true,
  
  // Authentication methods
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  signInWithMagicLink: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  
  // Profile methods
  updateProfile: async () => {},
  refreshProfile: async () => {},
  
  // Utility methods
  isAuthenticated: false,
  isLoading: true,
})

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { session: currentSession } = await getCurrentSession()
        
        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          
          // Load user profile
          await loadUserProfile(currentSession.user.id)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
        setInitializing(false)
      }
    }

    initializeAuth()
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // User signed in, load their profile
        await loadUserProfile(session.user.id)
      } else {
        // User signed out, clear profile
        setProfile(null)
      }
      
      // Auth state has been determined
      if (initializing) {
        setLoading(false)
        setInitializing(false)
      }
    })

    return unsubscribe
  }, [initializing])

  // Listen for session changes across tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key?.startsWith('sb-') && (event.key.endsWith('-auth-token') || event.key.endsWith('-auth-token-code-verifier'))) {
        console.log('Auth state change detected in another tab.');
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            loadUserProfile(currentUser.id);
          } else {
            setProfile(null);
          }
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Load user profile from database
  const loadUserProfile = async (userId) => {
    if (!userId) return

    try {
      const { profile, error } = await getUserProfile(userId)
      
      if (error) {
        console.error('Failed to load profile:', error)
        return
      }

      setProfile(profile)
    } catch (error) {
      console.error('Profile loading error:', error)
    }
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const result = await supabaseSignIn(email, password)
      
      if (result.error) {
        throw result.error
      }

      return { success: true, user: result.user }
    } catch (error) {
      console.error('Sign in error:', error)
      return { 
        success: false, 
        error: parseErrorMessage(error) 
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true)
      const result = await supabaseSignUp(email, password, metadata)
      
      if (result.error) {
        throw result.error
      }

      return { 
        success: true, 
        user: result.user,
        message: 'Please check your email to confirm your account.'
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return { 
        success: false, 
        error: parseErrorMessage(error) 
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      const result = await supabaseSignOut()
      
      if (result.error) {
        throw result.error
      }

      // Clear local state
      setUser(null)
      setSession(null)
      setProfile(null)

      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { 
        success: false, 
        error: parseErrorMessage(error) 
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with magic link
  const signInWithMagicLink = async (email) => {
    try {
      setLoading(true)
      const result = await supabaseMagicLink(email)
      
      if (result.error) {
        throw result.error
      }

      return { 
        success: true,
        message: 'Check your email for the magic link!'
      }
    } catch (error) {
      console.error('Magic link error:', error)
      return { 
        success: false, 
        error: parseErrorMessage(error) 
      }
    } finally {
      setLoading(false)
    }
  }

  // Reset password
  const resetPassword = async (email) => {
    try {
      const result = await supabaseResetPassword(email)
      
      if (result.error) {
        throw result.error
      }

      return { 
        success: true,
        message: 'Password reset email sent! Check your inbox.'
      }
    } catch (error) {
      console.error('Password reset error:', error)
      return { 
        success: false, 
        error: parseErrorMessage(error) 
      }
    }
  }

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      const result = await supabaseUpdatePassword(newPassword)
      
      if (result.error) {
        throw result.error
      }

      return { 
        success: true,
        message: 'Password updated successfully!'
      }
    } catch (error) {
      console.error('Password update error:', error)
      return { 
        success: false, 
        error: parseErrorMessage(error) 
      }
    }
  }

  // Update user profile
  const updateProfile = async (updates) => {
    if (!user?.id) {
      return { 
        success: false, 
        error: 'User not authenticated' 
      }
    }

    try {
      const result = await updateUserProfile(user.id, updates)
      
      if (result.error) {
        throw result.error
      }

      // Update local profile state
      setProfile(result.profile)

      return { 
        success: true,
        profile: result.profile,
        message: 'Profile updated successfully!'
      }
    } catch (error) {
      console.error('Profile update error:', error)
      return { 
        success: false, 
        error: parseErrorMessage(error) 
      }
    }
  }

  // Refresh user profile
  const refreshProfile = async () => {
    if (!user?.id) return

    await loadUserProfile(user.id)
  }

  // Check if user is authenticated
  const isAuthenticated = !!user && !!session

  // Check if still loading
  const isLoading = loading || initializing

  // Context value
  const value = {
    // State
    user,
    session,
    profile,
    loading,
    
    // Authentication methods
    signIn,
    signUp,
    signOut,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    
    // Profile methods
    updateProfile,
    refreshProfile,
    
    // Computed values
    isAuthenticated,
    isLoading,
    
    // User info shortcuts
    userId: user?.id,
    userEmail: user?.email,
    username: profile?.username,
    fullName: profile?.full_name,
    avatarUrl: profile?.avatar_url,
    teamId: profile?.team_id,
    teamName: profile?.teams?.name,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Higher-order component for protecting routes
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      // Redirect to login or show login prompt
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-center mb-4">Authentication Required</h2>
            <p className="text-gray-600 text-center mb-6">
              Please sign in to access this page.
            </p>
            <a 
              href="/login" 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center block"
            >
              Go to Login
            </a>
          </div>
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
}

// Hook for requiring authentication
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShouldRedirect(true)
    }
  }, [isAuthenticated, isLoading])

  return {
    isAuthenticated,
    isLoading,
    shouldRedirect
  }
}

// Hook for user profile with auto-loading
export const useUserProfile = () => {
  const { profile, refreshProfile, updateProfile, isAuthenticated } = useAuth()
  const [profileLoading, setProfileLoading] = useState(false)

  const refreshUserProfile = async () => {
    if (!isAuthenticated) return

    setProfileLoading(true)
    await refreshProfile()
    setProfileLoading(false)
  }

  return {
    profile,
    profileLoading,
    refreshProfile: refreshUserProfile,
    updateProfile,
    hasProfile: !!profile,
    isTeamMember: !!profile?.team_id,
    teamName: profile?.teams?.name
  }
}

export default AuthContext 