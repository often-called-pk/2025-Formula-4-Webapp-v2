-- Formula 4 Race Analytics 2025 - Storage Setup
-- Migration: 002_storage_setup.sql
-- Description: Set up storage buckets and policies for telemetry files and user avatars
-- 
-- ⚠️  IMPORTANT: This file contains the COMPLETE storage configuration for reference.
-- However, buckets and policies CANNOT be created via SQL Editor due to permission restrictions.
-- 
-- TO IMPLEMENT:
-- 1. Create buckets manually via Supabase Dashboard (Storage section)
-- 2. Set up policies manually via Supabase Dashboard (Storage > Policies)
-- 3. Run only the helper functions (see 002_storage_setup_cli.sql) via SQL Editor

-- =====================================================
-- STORAGE BUCKETS CONFIGURATION (Dashboard Only)
-- =====================================================

-- Create telemetry-files bucket for CSV uploads and race data
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'telemetry-files',
  'telemetry-files',
  false,
  52428800, -- 50MB limit
  ARRAY['text/csv', 'application/json', 'text/plain', 'application/octet-stream']
) ON CONFLICT (id) DO NOTHING;

-- Create user-avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TELEMETRY FILES STORAGE POLICIES
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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

-- Policy: Users can update their own telemetry files
CREATE POLICY "Users can update own telemetry files" ON storage.objects
FOR UPDATE USING (
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
    SELECT user_id::text 
    FROM public.team_memberships tm
    JOIN public.users u ON u.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
  )
);

-- =====================================================
-- USER AVATARS STORAGE POLICIES
-- =====================================================

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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that buckets were created correctly
-- SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;

-- Check storage policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'objects' AND schemaname = 'storage';

-- Test user storage usage function (replace with actual user UUID)
-- SELECT * FROM get_user_storage_usage('00000000-0000-0000-0000-000000000000');

-- =====================================================
-- EXAMPLE FILE UPLOAD PATHS
-- =====================================================

-- Telemetry file paths should follow this structure:
-- telemetry-files/{user_id}/sessions/{session_id}/raw_data.csv
-- telemetry-files/{user_id}/sessions/{session_id}/processed_data.json
-- telemetry-files/{user_id}/exports/lap_comparison_2025-01-15.json
-- telemetry-files/{user_id}/shared/public_sessions/{session_id}/data.csv

-- Avatar file paths should follow this structure:
-- user-avatars/{user_id}/avatar.jpg
-- user-avatars/{user_id}/avatar_thumb.jpg 