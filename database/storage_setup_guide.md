# Supabase Storage Setup Guide

This guide walks you through setting up storage buckets and policies for the Formula 4 Race Analytics application.

## Why Can't I Use SQL Editor?

The `storage.objects` table is a system table in Supabase that requires special privileges to modify. You'll get an "ERROR: 42501: must be owner of table objects" error if you try to create storage buckets or policies via the SQL editor.

## Setup Methods

### Method 1: Supabase Dashboard (Recommended)

#### Step 1: Create Storage Buckets

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**

**Create telemetry-files bucket:**
- **Name:** `telemetry-files`
- **Public:** `false` (unchecked)
- **File size limit:** `50 MB` (52428800 bytes)
- **Allowed MIME types:** `text/csv,application/json,text/plain,application/octet-stream`

**Create user-avatars bucket:**
- **Name:** `user-avatars`
- **Public:** `true` (checked)
- **File size limit:** `5 MB` (5242880 bytes)
- **Allowed MIME types:** `image/jpeg,image/jpg,image/png,image/gif,image/webp`

#### Step 2: Set Up RLS Policies

Go to **Storage** → **Policies** and create the following policies:

**For telemetry-files bucket:**

1. **Policy Name:** "Users can upload telemetry files"
   - **Operation:** INSERT
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'telemetry-files' 
   AND auth.role() = 'authenticated'
   AND (storage.foldername(name))[1] = auth.uid()::text
   ```

2. **Policy Name:** "Users can view own telemetry files"
   - **Operation:** SELECT
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'telemetry-files'
   AND (storage.foldername(name))[1] = auth.uid()::text
   ```

3. **Policy Name:** "Users can update own telemetry files"
   - **Operation:** UPDATE
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'telemetry-files'
   AND (storage.foldername(name))[1] = auth.uid()::text
   ```

4. **Policy Name:** "Users can delete own telemetry files"
   - **Operation:** DELETE
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'telemetry-files'
   AND (storage.foldername(name))[1] = auth.uid()::text
   ```

5. **Policy Name:** "Team members can view shared telemetry files"
   - **Operation:** SELECT
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'telemetry-files'
   AND (storage.foldername(name))[2] = 'shared'
   AND (storage.foldername(name))[1] IN (
     SELECT user_id::text 
     FROM public.team_memberships tm
     JOIN public.users u ON u.team_id = tm.team_id
     WHERE tm.user_id = auth.uid()
   )
   ```

**For user-avatars bucket:**

1. **Policy Name:** "Users can upload own avatar"
   - **Operation:** INSERT
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'user-avatars'
   AND auth.role() = 'authenticated'
   AND (storage.foldername(name))[1] = auth.uid()::text
   ```

2. **Policy Name:** "Anyone can view avatars"
   - **Operation:** SELECT
   - **Target roles:** anon, authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'user-avatars'
   ```

3. **Policy Name:** "Users can update own avatar"
   - **Operation:** UPDATE
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'user-avatars'
   AND (storage.foldername(name))[1] = auth.uid()::text
   ```

4. **Policy Name:** "Users can delete own avatar"
   - **Operation:** DELETE
   - **Target roles:** authenticated
   - **Policy definition:**
   ```sql
   bucket_id = 'user-avatars'
   AND (storage.foldername(name))[1] = auth.uid()::text
   ```

#### Step 3: Run Helper Functions

After setting up buckets and policies, run the helper functions via SQL Editor:

```sql
-- Copy and paste the contents of database/migrations/002_storage_setup_cli.sql
-- into the SQL Editor and execute
```

### Method 2: Supabase CLI (Alternative)

If you have the Supabase CLI installed, you can use these commands:

```bash
# Create buckets
supabase storage create telemetry-files --size-limit 52428800 --allowed-mime-types "text/csv,application/json,text/plain,application/octet-stream"
supabase storage create user-avatars --public --size-limit 5242880 --allowed-mime-types "image/jpeg,image/jpg,image/png,image/gif,image/webp"
```

Then create policies using the dashboard or through database functions.

## Verification

After setup, verify your configuration:

1. **Check buckets exist:**
   - Go to Storage in dashboard
   - You should see both `telemetry-files` and `user-avatars` buckets

2. **Check policies:**
   - Go to Storage → Policies
   - You should see all the policies listed above

3. **Test storage functions:**
   ```sql
   -- Test with a real user UUID from your auth.users table
   SELECT * FROM get_user_storage_usage('your-user-uuid-here');
   ```

## File Structure

Your files will be organized as follows:

```
telemetry-files/
  └── {user_id}/
      ├── sessions/
      │   └── {session_id}/
      │       ├── raw_data.csv
      │       └── processed_data.json
      ├── exports/
      │   └── lap_comparison_2025-01-15.json
      └── shared/
          └── public_sessions/
              └── {session_id}/
                  └── data.csv

user-avatars/
  └── {user_id}/
      ├── avatar.jpg
      └── avatar_thumb.jpg
```

This structure is created automatically by your application code when uploading files - you don't need to create these folders manually. 