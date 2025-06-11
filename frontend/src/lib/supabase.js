// Formula 4 Race Analytics 2025 - Supabase Client Configuration
// This file sets up the Supabase client for authentication and database operations

import { createClient } from '@supabase/supabase-js'

// Supabase configuration - these should be set in environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-ref.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// Create Supabase client with auth options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Redirect to login page after session expires
    redirectTo: `${window.location.origin}/login`
  },
  // Global settings for database operations
  db: {
    schema: 'public'
  },
  // Global settings for storage operations
  storage: {
    buckets: {
      telemetryFiles: 'telemetry-files',
      userAvatars: 'user-avatars'
    }
  }
})

// =====================================================
// AUTHENTICATION HELPERS
// =====================================================

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {object} metadata - Additional user metadata (username, etc.)
 * @returns {Promise<{user, error}>}
 */
export const signUp = async (email, password, metadata = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: metadata.username || email.split('@')[0],
          full_name: metadata.fullName || '',
          avatar_url: metadata.avatarUrl || null,
          ...metadata
        },
        // Redirect URL after email confirmation
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error

    return { user: data.user, error: null }
  } catch (error) {
    console.error('Sign up error:', error.message)
    return { user: null, error }
  }
}

/**
 * Sign in a user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{user, session, error}>}
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    return { user: data.user, session: data.session, error: null }
  } catch (error) {
    console.error('Sign in error:', error.message)
    return { user: null, session: null, error }
  }
}

/**
 * Sign in with magic link (passwordless)
 * @param {string} email - User's email address
 * @returns {Promise<{error}>}
 */
export const signInWithMagicLink = async (email) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Magic link error:', error.message)
    return { error }
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{error}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Sign out error:', error.message)
    return { error }
  }
}

/**
 * Reset password for a user
 * @param {string} email - User's email address
 * @returns {Promise<{error}>}
 */
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Password reset error:', error.message)
    return { error }
  }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<{user, error}>}
 */
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error

    return { user: data.user, error: null }
  } catch (error) {
    console.error('Password update error:', error.message)
    return { user: null, error }
  }
}

/**
 * Get the current user
 * @returns {Promise<{user, error}>}
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) throw error

    return { user, error: null }
  } catch (error) {
    console.error('Get current user error:', error.message)
    return { user: null, error }
  }
}

/**
 * Get the current session
 * @returns {Promise<{session, error}>}
 */
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) throw error

    return { session, error: null }
  } catch (error) {
    console.error('Get current session error:', error.message)
    return { session: null, error }
  }
}

// =====================================================
// DATABASE HELPERS
// =====================================================

/**
 * Get user profile from the users table
 * @param {string} userId - User's UUID
 * @returns {Promise<{profile, error}>}
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        full_name,
        avatar_url,
        team_id,
        teams (
          id,
          name,
          description
        ),
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()

    if (error) throw error

    return { profile: data, error: null }
  } catch (error) {
    console.error('Get user profile error:', error.message)
    return { profile: null, error }
  }
}

/**
 * Update user profile
 * @param {string} userId - User's UUID
 * @param {object} updates - Profile updates
 * @returns {Promise<{profile, error}>}
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return { profile: data, error: null }
  } catch (error) {
    console.error('Update user profile error:', error.message)
    return { profile: null, error }
  }
}

// =====================================================
// STORAGE HELPERS
// =====================================================

/**
 * Upload a file to storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path within bucket
 * @param {File} file - File object to upload
 * @param {object} options - Upload options
 * @returns {Promise<{data, error}>}
 */
export const uploadFile = async (bucket, path, file, options = {}) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('File upload error:', error.message)
    return { data: null, error }
  }
}

/**
 * Get a public URL for a file
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path within bucket
 * @returns {string} Public URL
 */
export const getFileUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

/**
 * Upload user avatar
 * @param {string} userId - User's UUID
 * @param {File} avatarFile - Avatar image file
 * @returns {Promise<{url, error}>}
 */
export const uploadUserAvatar = async (userId, avatarFile) => {
  try {
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`

    const { data, error } = await uploadFile('user-avatars', fileName, avatarFile, {
      upsert: true // Allow overwriting existing avatar
    })

    if (error) throw error

    const avatarUrl = getFileUrl('user-avatars', fileName)

    // Update user profile with new avatar URL
    await updateUserProfile(userId, { avatar_url: avatarUrl })

    return { url: avatarUrl, error: null }
  } catch (error) {
    console.error('Avatar upload error:', error.message)
    return { url: null, error }
  }
}

/**
 * Upload telemetry data file
 * @param {string} userId - User's UUID
 * @param {string} sessionId - Session UUID
 * @param {File} telemetryFile - CSV or JSON telemetry file
 * @param {string} fileType - 'raw' or 'processed'
 * @returns {Promise<{path, error}>}
 */
export const uploadTelemetryFile = async (userId, sessionId, telemetryFile, fileType = 'raw') => {
  try {
    const fileExt = telemetryFile.name.split('.').pop()
    const fileName = `${userId}/sessions/${sessionId}/${fileType}_data.${fileExt}`

    const { data, error } = await uploadFile('telemetry-files', fileName, telemetryFile)

    if (error) throw error

    return { path: data.path, error: null }
  } catch (error) {
    console.error('Telemetry file upload error:', error.message)
    return { path: null, error }
  }
}

// =====================================================
// AUTH STATE MANAGEMENT
// =====================================================

/**
 * Listen to auth state changes
 * @param {function} callback - Callback function to handle auth changes
 * @returns {function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in:', session.user.email)
          break
        case 'SIGNED_OUT':
          console.log('User signed out')
          break
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed for user:', session.user.email)
          break
        case 'USER_UPDATED':
          console.log('User updated:', session.user.email)
          break
        default:
          break
      }

      await callback(event, session)
    }
  )

  // Return unsubscribe function
  return () => subscription.unsubscribe()
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Parse Supabase error messages into user-friendly format
 * @param {object} error - Supabase error object
 * @returns {string} User-friendly error message
 */
export const parseErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred'

  // Common authentication errors
  const errorMessages = {
    'Invalid login credentials': 'Invalid email or password. Please try again.',
    'Email not confirmed': 'Please check your email and click the confirmation link.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Unable to validate email address: invalid format': 'Please enter a valid email address.',
    'Token has expired or is invalid': 'Your session has expired. Please sign in again.',
    'User not found': 'No account found with this email address.',
    'Email rate limit exceeded': 'Too many emails sent. Please wait before trying again.',
    'Signup is disabled': 'New user registration is currently disabled.',
  }

  return errorMessages[error.message] || error.message || 'An error occurred. Please try again.'
}

// Export the supabase client as default
export default supabase 