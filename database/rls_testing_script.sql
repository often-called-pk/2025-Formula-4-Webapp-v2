-- Formula 4 Race Analytics 2025 - RLS Testing Script
-- Purpose: Test all Row Level Security policies to ensure proper data isolation and access control
-- Run this script in Supabase SQL Editor after enabling authentication

-- =====================================================
-- TEST DATA SETUP
-- =====================================================

-- Note: This script assumes you have test users already created via authentication
-- You'll need to replace the UUIDs below with actual user IDs from auth.users

-- Create test team
INSERT INTO public.teams (id, name, description, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'RLS Test Team Alpha',
  'Test team for RLS policy verification',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create second test team
INSERT INTO public.teams (id, name, description, created_at, updated_at) 
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'RLS Test Team Beta',
  'Second test team for isolation testing',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS FOR TESTING
-- =====================================================

-- Function to simulate authenticated user context
CREATE OR REPLACE FUNCTION test_as_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Note: This is a simplified test helper
  -- In real testing, you'd use actual authentication tokens
  RAISE NOTICE 'Testing as user: %', user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to check RLS policy results
CREATE OR REPLACE FUNCTION check_rls_result(
  test_name TEXT,
  expected_count INTEGER,
  actual_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  IF expected_count = actual_count THEN
    RAISE NOTICE '✅ PASS: % - Expected: %, Got: %', test_name, expected_count, actual_count;
  ELSE
    RAISE NOTICE '❌ FAIL: % - Expected: %, Got: %', test_name, expected_count, actual_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICY VERIFICATION QUERIES
-- =====================================================

-- Test 1: Users Table Policies
-- Users should only see their own profile and team members
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  RAISE NOTICE '=== TESTING USERS TABLE RLS POLICIES ===';
  
  -- Test: User can see their own profile
  -- Note: Replace 'auth.uid()' with actual test user UUID when running with real auth
  SELECT COUNT(*) INTO user_count
  FROM public.users 
  WHERE id = auth.uid();
  
  PERFORM check_rls_result('User can see own profile', 1, user_count);
  
  -- Test: Users can see team members
  SELECT COUNT(*) INTO user_count
  FROM public.users u1
  WHERE u1.team_id IN (
    SELECT u2.team_id 
    FROM public.users u2 
    WHERE u2.id = auth.uid()
  );
  
  RAISE NOTICE 'Team members visible count: %', user_count;
END;
$$;

-- Test 2: Teams Table Policies  
-- All teams should be visible (public read), only owners can edit
DO $$
DECLARE
  team_count INTEGER;
BEGIN
  RAISE NOTICE '=== TESTING TEAMS TABLE RLS POLICIES ===';
  
  -- Test: All teams visible for reading
  SELECT COUNT(*) INTO team_count FROM public.teams;
  RAISE NOTICE 'Total teams visible: %', team_count;
  
  -- Test: User can only update teams they created
  -- This would need actual authentication context to test properly
  RAISE NOTICE 'Team update policies require authenticated user context to test';
END;
$$;

-- Test 3: Telemetry Sessions Policies
-- Users should see own sessions + team shared sessions + public sessions
DO $$
DECLARE
  session_count INTEGER;
  test_user_id UUID := auth.uid();
BEGIN
  RAISE NOTICE '=== TESTING TELEMETRY SESSIONS RLS POLICIES ===';
  
  -- Create test sessions for different scenarios
  INSERT INTO public.telemetry_sessions (id, user_id, track_name, session_date, sharing_level, created_at, updated_at)
  VALUES 
    -- User's own private session
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', test_user_id, 'Silverstone', NOW(), 'private', NOW(), NOW()),
    -- User's own team-shared session  
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', test_user_id, 'Brands Hatch', NOW(), 'team', NOW(), NOW()),
    -- User's own public session
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', test_user_id, 'Donington', NOW(), 'public', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Test: User can see their own sessions
  SELECT COUNT(*) INTO session_count
  FROM public.telemetry_sessions 
  WHERE user_id = test_user_id;
  
  PERFORM check_rls_result('User can see own sessions', 3, session_count);
  
  -- Test: Public sessions are visible
  SELECT COUNT(*) INTO session_count
  FROM public.telemetry_sessions 
  WHERE sharing_level = 'public';
  
  RAISE NOTICE 'Public sessions visible: %', session_count;
END;
$$;

-- Test 4: Telemetry Data Policies
-- Access should follow session visibility rules
DO $$
DECLARE
  data_count INTEGER;
  test_session_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
  RAISE NOTICE '=== TESTING TELEMETRY DATA RLS POLICIES ===';
  
  -- Create test telemetry data
  INSERT INTO public.telemetry_data (session_id, timestamp, speed_kmh, distance_m, throttle_position, brake_pressure, steering_angle, gear)
  VALUES 
    (test_session_id, NOW(), '150.5', '1000', '0.8', '0.2', '5.5', '6'),
    (test_session_id, NOW() + INTERVAL '1 second', '155.2', '1100', '0.9', '0.1', '3.2', '6')
  ON CONFLICT DO NOTHING;
  
  -- Test: User can see telemetry data for accessible sessions
  SELECT COUNT(*) INTO data_count
  FROM public.telemetry_data td
  WHERE td.session_id IN (
    SELECT ts.id FROM public.telemetry_sessions ts 
    WHERE ts.user_id = auth.uid()
  );
  
  RAISE NOTICE 'Telemetry data points accessible: %', data_count;
END;
$$;

-- Test 5: Fastest Laps Policies
-- Should follow session visibility for leaderboard access
DO $$
DECLARE
  fastest_lap_count INTEGER;
BEGIN
  RAISE NOTICE '=== TESTING FASTEST LAPS RLS POLICIES ===';
  
  -- Test: Fastest laps visibility based on session access
  SELECT COUNT(*) INTO fastest_lap_count
  FROM public.fastest_laps fl
  WHERE fl.session_id IN (
    SELECT ts.id FROM public.telemetry_sessions ts
    WHERE ts.sharing_level = 'public'
    OR ts.user_id = auth.uid()
    OR (ts.sharing_level = 'team' AND ts.user_id IN (
      SELECT u.id FROM public.users u WHERE u.team_id = (
        SELECT team_id FROM public.users WHERE id = auth.uid()
      )
    ))
  );
  
  RAISE NOTICE 'Fastest laps visible: %', fastest_lap_count;
END;
$$;

-- Test 6: Team Memberships Policies
-- Users should see memberships for their teams
DO $$
DECLARE
  membership_count INTEGER;
BEGIN
  RAISE NOTICE '=== TESTING TEAM MEMBERSHIPS RLS POLICIES ===';
  
  -- Test: User can see team memberships for their team
  SELECT COUNT(*) INTO membership_count
  FROM public.team_memberships tm
  WHERE tm.team_id IN (
    SELECT u.team_id FROM public.users u WHERE u.id = auth.uid()
  );
  
  RAISE NOTICE 'Team memberships visible: %', membership_count;
END;
$$;

-- =====================================================
-- ISOLATION TESTING
-- =====================================================

-- Test that users cannot access other users' private data
DO $$
DECLARE
  isolation_test_count INTEGER;
  test_user_id UUID := auth.uid();
BEGIN
  RAISE NOTICE '=== TESTING DATA ISOLATION ===';
  
  -- Create a session for a different user (simulated)
  INSERT INTO public.telemetry_sessions (id, user_id, track_name, session_date, sharing_level, created_at, updated_at)
  VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '99999999-9999-9999-9999-999999999999', -- Different user
    'Spa-Francorchamps',
    NOW(),
    'private',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Test: Current user should NOT see other user's private sessions
  SELECT COUNT(*) INTO isolation_test_count
  FROM public.telemetry_sessions 
  WHERE user_id = '99999999-9999-9999-9999-999999999999'
  AND sharing_level = 'private';
  
  PERFORM check_rls_result('Cannot see other users private sessions', 0, isolation_test_count);
END;
$$;

-- =====================================================
-- PERFORMANCE TESTING
-- =====================================================

-- Test RLS policy performance with larger dataset
DO $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration INTERVAL;
BEGIN
  RAISE NOTICE '=== TESTING RLS PERFORMANCE ===';
  
  start_time := clock_timestamp();
  
  -- Perform a complex query that exercises multiple RLS policies
  PERFORM COUNT(*)
  FROM public.telemetry_sessions ts
  JOIN public.telemetry_data td ON ts.id = td.session_id
  JOIN public.users u ON ts.user_id = u.id
  WHERE ts.sharing_level = 'public'
  OR ts.user_id = auth.uid()
  OR (ts.sharing_level = 'team' AND u.team_id = (
    SELECT team_id FROM public.users WHERE id = auth.uid()
  ));
  
  end_time := clock_timestamp();
  duration := end_time - start_time;
  
  RAISE NOTICE 'Complex RLS query completed in: %', duration;
  
  IF EXTRACT(EPOCH FROM duration) < 1.0 THEN
    RAISE NOTICE '✅ PERFORMANCE: Query completed in acceptable time';
  ELSE
    RAISE NOTICE '⚠️  PERFORMANCE: Query took longer than expected - consider index optimization';
  END IF;
END;
$$;

-- =====================================================
-- CLEANUP TEST DATA
-- =====================================================

-- Clean up test data (optional - comment out if you want to keep test data)
/*
DELETE FROM public.telemetry_data WHERE session_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

DELETE FROM public.telemetry_sessions WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

DELETE FROM public.teams WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
*/

-- =====================================================
-- FINAL VERIFICATION REPORT
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== RLS TESTING COMPLETED ===';
  RAISE NOTICE 'Review the test results above for any failures.';
  RAISE NOTICE 'For full testing, run this script with authenticated user contexts.';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test with real user authentication tokens';
  RAISE NOTICE '2. Verify storage bucket policies separately';
  RAISE NOTICE '3. Test frontend authentication integration';
END;
$$;

-- =====================================================
-- MANUAL TESTING CHECKLIST
-- =====================================================

/*
MANUAL TESTING CHECKLIST (perform with real authenticated users):

✅ Authentication Flow Testing:
[ ] User registration with email verification
[ ] User login/logout 
[ ] Password reset flow
[ ] Session timeout handling
[ ] Token refresh

✅ Users Table RLS:
[ ] User can view/edit their own profile
[ ] User can view team member profiles  
[ ] User cannot edit other users' profiles
[ ] User cannot see users from other teams (if not shared)

✅ Teams Table RLS:
[ ] All users can view team listings
[ ] Only team owners can edit team details
[ ] Team deletion restricted to owners

✅ Telemetry Sessions RLS:
[ ] User can CRUD their own sessions
[ ] User can view team-shared sessions from teammates
[ ] User can view public sessions from anyone
[ ] User cannot access private sessions from other users

✅ Telemetry Data RLS:
[ ] Access inherits from session visibility
[ ] No direct access to data from inaccessible sessions
[ ] Team sharing works for telemetry data

✅ Fastest Laps RLS:
[ ] Public leaderboards show all qualifying times
[ ] User personal bests include all accessible sessions
[ ] Team leaderboards respect session sharing

✅ Team Memberships RLS:
[ ] Users see memberships for their teams
[ ] Team admins can manage memberships
[ ] No cross-team membership visibility

✅ Storage Policies:
[ ] Users can upload files to their own directories
[ ] Users cannot access other users' private files
[ ] Public files (avatars) are accessible
[ ] Team shared files work correctly

✅ Performance:
[ ] RLS queries complete in reasonable time
[ ] No N+1 query issues with complex filters
[ ] Indexes support RLS policy conditions
*/ 