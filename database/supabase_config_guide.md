# Supabase Configuration Guide - Formula 4 Race Analytics 2025

## Prerequisites
- Supabase project "formula4-race-analytics-2025" created
- Initial schema migration (001_initial_schema.sql) executed
- Access to Supabase dashboard

---

## Task 2.2: Configure Authentication and Row Level Security

### ✅ **RLS Policies** (Already Completed)
The comprehensive RLS policies were included in the initial schema migration and are already active:
- ✅ Users table policies (view/update own profile + team member profiles)
- ✅ Teams table policies (public view, owner-only edit)
- ✅ Telemetry sessions policies (owner + team + public sharing)
- ✅ Telemetry data policies (inherit session visibility)
- ✅ Fastest laps policies (public leaderboard)
- ✅ Team memberships policies (team-based access)

### 🔧 **Authentication Configuration** (Manual Steps Required)

#### Step 1: Enable Email/Password Authentication
1. **Navigate to Authentication** in Supabase Dashboard
2. **Go to Settings > Auth**
3. **Enable Email/Password Provider**:
   - Toggle "Email" to enabled
   - Set "Confirm email" to `true` (recommended for production)
   - Set "Secure email change" to `true`

#### Step 2: Configure Site URL and Redirect URLs
1. **In Auth Settings**, configure:
   - **Site URL**: `http://localhost:5173` (development)
   - **Additional Redirect URLs**: 
     ```
     http://localhost:5173/auth/callback
     http://localhost:5173/
     https://your-production-domain.com/auth/callback
     https://your-production-domain.com/
     ```

#### Step 3: Configure Email Templates (Optional but Recommended)
1. **Go to Auth > Templates**
2. **Customize templates**:
   - **Confirm signup**: Welcome message for new drivers
   - **Magic link**: Quick login for returning users
   - **Change email address**: Email change confirmation
   - **Reset password**: Password reset instructions

**Example Custom Signup Template**:
```html
<h2>Welcome to Formula 4 Race Analytics 2025!</h2>
<p>Hi {{ .Name }},</p>
<p>Welcome to the ultimate Formula 4 telemetry analysis platform! Click the link below to confirm your email and start analyzing your racing data:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}">Confirm your email</a></p>
<p>Ready to take your racing to the next level?</p>
<p>The Formula 4 Analytics Team</p>
```

**Example Magic Link Template**:
```html
<h2>Log in to Formula 4 Race Analytics 2025</h2>
<p>Hi {{ .Name }},</p>
<p>Click the link below to securely log in to your account:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}">Log in to your account</a></p>
<p>This link will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
<p>The Formula 4 Analytics Team</p>
```

**Example Change Email Address Template**:
```html
<h2>Confirm Your New Email Address</h2>
<p>Hi {{ .Name }},</p>
<p>You requested to change the email address associated with your Formula 4 Race Analytics account. Please click the link below to confirm this change:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&redirect_to={{ .RedirectTo }}">Confirm new email address</a></p>
<p>If you did not request this change, please contact our support team immediately.</p>
<p>The Formula 4 Analytics Team</p>
```

**Example Reset Password Template**:
```html
<h2>Reset Your Password for Formula 4 Race Analytics 2025</h2>
<p>Hi {{ .Name }},</p>
<p>We received a request to reset your password. Click the link below to set a new password:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}">Reset your password</a></p>
<p>This link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
<p>The Formula 4 Analytics Team</p>
```

#### Step 4: Configure Session Settings
1. **In Auth Settings**:
   - **JWT expiry**: `3600` seconds (1 hour) 
   - **Refresh token rotation**: `true`
   - **Reuse interval**: `10` seconds
   - **Session timeout**: `8 hours`

---

## Task 2.3: Set Up Storage Buckets and File Upload Configuration

### Step 1: Create Storage Buckets

#### 🗂️ **Create "telemetry-files" Bucket**
1. **Navigate to Storage** in Supabase Dashboard
2. **Click "New Bucket"**
3. **Configure**:
   - **Name**: `telemetry-files`
   - **Public**: `false` (private bucket)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: `text/csv,application/json,text/plain`

#### 🖼️ **Create "user-avatars" Bucket**
1. **Click "New Bucket"**
2. **Configure**:
   - **Name**: `user-avatars`
   - **Public**: `true` (for profile picture access)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/gif`

### Step 2: Configure Bucket Policies

#### **Telemetry Files Bucket Policies**
Execute in SQL Editor:

```sql
-- Telemetry files bucket policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'telemetry-files',
  'telemetry-files',
  false,
  52428800,
  ARRAY['text/csv', 'application/json', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own telemetry files
CREATE POLICY "Users can upload telemetry files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'telemetry-files' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own telemetry files
CREATE POLICY "Users can view own telemetry files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'telemetry-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own telemetry files
CREATE POLICY "Users can delete own telemetry files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'telemetry-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Team members can view shared telemetry files
CREATE POLICY "Team members can view shared telemetry files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'telemetry-files'
  AND (storage.foldername(name))[2] = 'shared'
  AND (storage.foldername(name))[1] IN (
    SELECT user_id::text FROM public.team_memberships tm
    JOIN public.users u ON u.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
  )
);
```

#### **User Avatars Bucket Policies**
```sql
-- User avatars bucket policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'user-avatars');

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Folder Structure

#### **Recommended Folder Structure**
```
telemetry-files/
├── {user_id}/
│   ├── sessions/
│   │   ├── {session_id}/
│   │   │   ├── raw_data.csv
│   │   │   ├── processed_data.json
│   │   │   └── metadata.json
│   │   └── ...
│   └── exports/
│       ├── lap_comparison_2025-01-15.json
│       └── ...
└── shared/
    └── {user_id}/
        └── public_sessions/
            └── {session_id}/
                └── ...

user-avatars/
└── {user_id}/
    ├── avatar.jpg
    └── avatar_thumb.jpg
```

#### **How to Implement This Structure**

You don't need to pre-create these folders in the Supabase dashboard. This structure is created **automatically by your application code** when you upload files. The file path you use in your upload function dictates the folder hierarchy.

##### **Implementation Example (JavaScript)**

Here's how you would implement this in your application using the Supabase JavaScript client.

**1. Uploading a Telemetry File:**

When a user uploads a telemetry file, you construct the path using their unique `user_id` and the `session_id`.

```javascript
// Example function to upload a user's telemetry data
async function uploadTelemetryFile(userId, sessionId, fileObject) {
  // Construct the path according to the recommended structure
  const filePath = `${userId}/sessions/${sessionId}/raw_data.csv`;

  const { data, error } = await supabase
    .storage
    .from('telemetry-files') // Target the correct bucket
    .upload(filePath, fileObject); // 'fileObject' is the File from the browser

  if (error) {
    console.error('Error uploading telemetry file:', error.message);
    return null;
  }

  console.log('File uploaded successfully:', data.path);
  // Supabase automatically created the folders:
  // /telemetry-files/{user_id}/sessions/{session_id}/raw_data.csv
  return data;
}
```

**2. Uploading a User Avatar:**

The same principle applies to user avatars, which have a simpler path.

```javascript
// Example function to upload or update a user's avatar
async function uploadUserAvatar(userId, avatarFile) {
  // Path for the user's avatar
  const filePath = `${userId}/avatar.jpg`;

  const { data, error } = await supabase
    .storage
    .from('user-avatars') // Target the public avatars bucket
    .upload(filePath, avatarFile, {
      cacheControl: '3600',
      upsert: true // This will overwrite the file if it already exists
    });

  if (error) {
    console.error('Error uploading avatar:', error.message);
    return null;
  }

  console.log('Avatar uploaded successfully:', data.path);
  return data;
}
```

This dynamic folder creation is precisely what your Row Level Security (RLS) policies are designed to work with. For instance, the policy that checks `(storage.foldername(name))[1] = auth.uid()::text` is verifying that the first folder in the path matches the ID of the authenticated user, thus ensuring they can only write to their own directory.

---

## Testing Procedures

### **Authentication Testing**
1. **Test User Signup**:
   - Create new account via frontend
   - Verify email confirmation flow
   - Check user profile creation in database

2. **Test RLS Policies**:
   - Create multiple test users
   - Verify users can only access their own data
   - Test team-based sharing

3. **Test Session Management**:
   - Login/logout flows
   - Token refresh
   - Session timeout handling

### **Storage Testing**
1. **Test File Uploads**:
   - Upload telemetry CSV files
   - Upload avatar images
   - Verify file size/type restrictions

2. **Test Access Controls**:
   - Verify users can only access their own files
   - Test team file sharing
   - Test public avatar access

3. **Test File Operations**:
   - Upload, download, delete files
   - Verify folder structure
   - Test file overwrite scenarios

---

## Environment Variables

After completing the configuration, you'll need these environment variables:

```env
# Get these from Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Custom auth settings
SUPABASE_JWT_SECRET=your-jwt-secret
```

---

## Verification Checklist

### ✅ **Authentication Configuration**
- [ ] Email/password authentication enabled
- [ ] Site URLs configured for development and production
- [ ] Email templates customized (optional)
- [ ] Session settings configured

### ✅ **Storage Configuration**
- [ ] `telemetry-files` bucket created with correct settings
- [ ] `user-avatars` bucket created with correct settings
- [ ] Storage policies applied and tested
- [ ] Folder structure documented

### ✅ **Security Verification**
- [ ] RLS policies active and tested
- [ ] Storage access controls verified
- [ ] Test users can only access appropriate data
- [ ] Team sharing works correctly

### ✅ **Integration Ready**
- [ ] Environment variables documented
- [ ] Authentication flow tested
- [ ] File upload/download tested
- [ ] Ready for client integration (Task 2.5)

---

## Next Steps

Once this configuration is complete:
1. **Task 2.4**: Create Database Functions and Stored Procedures
2. **Task 2.5**: Install and Configure Supabase Clients
3. **Integration Testing**: Full end-to-end testing with frontend/backend 
