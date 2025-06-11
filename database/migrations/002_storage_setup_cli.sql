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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test user storage usage function (replace with actual user UUID)
-- SELECT * FROM get_user_storage_usage('00000000-0000-0000-0000-000000000000');

-- Test cleanup function
-- SELECT cleanup_temp_files(); 