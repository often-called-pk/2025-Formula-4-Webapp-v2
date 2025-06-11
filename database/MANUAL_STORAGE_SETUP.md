# Manual Supabase Storage Setup (Task 2.3)

This guide provides the manual steps required to set up Supabase Storage. You must perform these actions in your Supabase project dashboard, as they cannot be automated due to security permissions.

---

## Step 1: Create Storage Buckets

Navigate to the **Storage** section in your Supabase project dashboard and create the following two buckets.

### Bucket 1: `telemetry-files`
-   **Bucket name:** `telemetry-files`
-   **Public bucket:** `false` (leave unchecked)
-   **File size limit:** `50MB`
-   **Allowed MIME types:** `text/csv`, `application/json`, `text/plain`, `application/octet-stream`

### Bucket 2: `user-avatars`
-   **Bucket name:** `user-avatars`
-   **Public bucket:** `true` (check this box)
-   **File size limit:** `5MB`
-   **Allowed MIME types:** `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`

---

## Step 2: Create RLS Policies for Storage

Navigate to **Storage** -> **Policies** in your dashboard. Create a new policy for each of the items below.

### Policies for `telemetry-files` Bucket

1.  **Policy Name:** `Users can upload telemetry files`
    *   **Allowed operation:** `INSERT`
    *   **Target roles:** `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'telemetry-files' AND (storage.foldername(name))[1] = (auth.uid())::text)
        ```

2.  **Policy Name:** `Users can view own telemetry files`
    *   **Allowed operation:** `SELECT`
    *   **Target roles:** `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'telemetry-files' AND (storage.foldername(name))[1] = (auth.uid())::text)
        ```

3.  **Policy Name:** `Users can update own telemetry files`
    *   **Allowed operation:** `UPDATE`
    *   **Target roles:** `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'telemetry-files' AND (storage.foldername(name))[1] = (auth.uid())::text)
        ```

4.  **Policy Name:** `Users can delete own telemetry files`
    *   **Allowed operation:** `DELETE`
    *   **Target roles:** `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'telemetry-files' AND (storage.foldername(name))[1] = (auth.uid())::text)
        ```

### Policies for `user-avatars` Bucket

1.  **Policy Name:** `Users can upload own avatar`
    *   **Allowed operation:** `INSERT`
    *   **Target roles:** `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)
        ```

2.  **Policy Name:** `Anyone can view avatars`
    *   **Allowed operation:** `SELECT`
    *   **Target roles:** `anon`, `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'user-avatars')
        ```

3.  **Policy Name:** `Users can update own avatar`
    *   **Allowed operation:** `UPDATE`
    *   **Target roles:** `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)
        ```

4.  **Policy Name:** `Users can delete own avatar`
    *   **Allowed operation:** `DELETE`
    *   **Target roles:** `authenticated`
    *   **USING expression:**
        ```sql
        (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = (auth.uid())::text)
        ```

---

## Step 3: Install Helper Functions

Navigate to the **SQL Editor** in your Supabase dashboard, click **"New query"**, and paste the entire content below into the editor. Then click **"Run"**.

```sql
-- Formula 4 Race Analytics 2025 - Storage Setup (Helper Functions Only)
-- Migration: 002_storage_setup_cli.sql
-- Description: Helper functions for storage management
-- Note: Buckets and policies must be created via Supabase Dashboard or CLI

-- =====================================================
-- HELPER FUNCTIONS FOR FILE MANAGEMENT
-- =====================================================

-- Function to get user's storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS TABLE (
  bucket_name TEXT,
  file_count BIGINT,
  total_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bucket_id as bucket_name,
    COUNT(*) as file_count,
    SUM(COALESCE(metadata->>'size', '0')::BIGINT) as total_size
  FROM storage.objects
  WHERE (storage.foldername(name))[1] = user_uuid::text
  GROUP BY bucket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old temporary files (can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_temp_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete files older than 7 days from temp folders
  WITH deleted AS (
    DELETE FROM storage.objects
    WHERE bucket_id IN ('telemetry-files', 'user-avatars')
    AND name LIKE '%/temp/%'
    AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access file
CREATE OR REPLACE FUNCTION user_can_access_file(file_path TEXT, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the file path starts with the user's UUID
  RETURN (storage.foldername(file_path))[1] = user_uuid::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get file URL with proper authentication
CREATE OR REPLACE FUNCTION get_file_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
DECLARE
  file_url TEXT;
BEGIN
  -- This function would typically generate a signed URL for private files
  -- For now, it returns the basic path structure
  RETURN format('/%s/%s', bucket_name, file_path);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

Once you have completed these three steps, the storage system will be fully configured. You can then mark Task 2.3 as complete. 