-- Formula 4 Race Analytics 2025 - Database Functions and Stored Procedures
-- Migration: 003_database_functions.sql
-- Description: Implement database functions for lap time calculations, statistics, and data operations

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to safely convert text to numeric (returns NULL if invalid)
CREATE OR REPLACE FUNCTION safe_numeric(text_val TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN text_val::NUMERIC;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate time difference in seconds between two timestamps
CREATE OR REPLACE FUNCTION time_diff_seconds(start_time TIMESTAMPTZ, end_time TIMESTAMPTZ)
RETURNS NUMERIC AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (end_time - start_time));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- LAP TIME CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate lap times from telemetry data
CREATE OR REPLACE FUNCTION calculate_lap_times(session_uuid UUID)
RETURNS TABLE (
  lap_number INTEGER,
  lap_time NUMERIC,
  start_timestamp TIMESTAMPTZ,
  end_timestamp TIMESTAMPTZ,
  avg_speed NUMERIC,
  max_speed NUMERIC,
  total_distance NUMERIC
) AS $$
DECLARE
  lap_count INTEGER := 0;
  current_lap_start TIMESTAMPTZ;
  current_lap_end TIMESTAMPTZ;
  prev_distance NUMERIC := 0;
  lap_threshold NUMERIC := 100; -- Distance threshold to detect new lap (meters)
BEGIN
  -- Get telemetry data ordered by timestamp
  FOR current_lap_start, current_lap_end IN
    SELECT 
      LAG(timestamp) OVER (ORDER BY timestamp) as lap_start,
      timestamp as lap_end
    FROM public.telemetry_data 
    WHERE session_id = session_uuid
    AND distance_m > prev_distance + lap_threshold
    ORDER BY timestamp
  LOOP
    IF current_lap_start IS NOT NULL THEN
      lap_count := lap_count + 1;
      
      -- Calculate lap statistics
      SELECT 
        time_diff_seconds(current_lap_start, current_lap_end),
        AVG(safe_numeric(speed_kmh)),
        MAX(safe_numeric(speed_kmh)),
        MAX(safe_numeric(distance_m)) - MIN(safe_numeric(distance_m))
      INTO lap_time, avg_speed, max_speed, total_distance
      FROM public.telemetry_data 
      WHERE session_id = session_uuid
      AND timestamp BETWEEN current_lap_start AND current_lap_end;
      
      lap_number := lap_count;
      start_timestamp := current_lap_start;
      end_timestamp := current_lap_end;
      
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to get fastest lap for a session
CREATE OR REPLACE FUNCTION get_session_fastest_lap(session_uuid UUID)
RETURNS TABLE (
  lap_number INTEGER,
  lap_time NUMERIC,
  avg_speed NUMERIC,
  max_speed NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lt.lap_number,
    lt.lap_time,
    lt.avg_speed,
    lt.max_speed
  FROM calculate_lap_times(session_uuid) lt
  WHERE lt.lap_time IS NOT NULL
  ORDER BY lt.lap_time ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SESSION STATISTICS FUNCTIONS
-- =====================================================

-- Function to aggregate session statistics
CREATE OR REPLACE FUNCTION calculate_session_statistics(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  session_data RECORD;
BEGIN
  SELECT 
    COUNT(*) as total_data_points,
    MIN(timestamp) as session_start,
    MAX(timestamp) as session_end,
    time_diff_seconds(MIN(timestamp), MAX(timestamp)) as session_duration,
    AVG(safe_numeric(speed_kmh)) as avg_speed,
    MAX(safe_numeric(speed_kmh)) as max_speed,
    MIN(safe_numeric(speed_kmh)) as min_speed,
    MAX(safe_numeric(distance_m)) as total_distance,
    COUNT(DISTINCT EXTRACT(MINUTE FROM timestamp)) as minutes_recorded
  INTO session_data
  FROM public.telemetry_data 
  WHERE session_id = session_uuid;
  
  -- Get fastest lap info
  WITH fastest_lap AS (
    SELECT lap_time, lap_number 
    FROM get_session_fastest_lap(session_uuid)
  ),
  lap_count AS (
    SELECT COUNT(*) as total_laps
    FROM calculate_lap_times(session_uuid)
  )
  SELECT json_build_object(
    'total_data_points', session_data.total_data_points,
    'session_start', session_data.session_start,
    'session_end', session_data.session_end,
    'session_duration_seconds', session_data.session_duration,
    'avg_speed_kmh', ROUND(session_data.avg_speed, 2),
    'max_speed_kmh', ROUND(session_data.max_speed, 2),
    'min_speed_kmh', ROUND(session_data.min_speed, 2),
    'total_distance_m', ROUND(session_data.total_distance, 2),
    'total_laps', lc.total_laps,
    'fastest_lap_time', ROUND(fl.lap_time, 3),
    'fastest_lap_number', fl.lap_number,
    'minutes_recorded', session_data.minutes_recorded
  ) INTO result
  FROM fastest_lap fl, lap_count lc;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPARISON FUNCTIONS
-- =====================================================

-- Function to compare lap times between two sessions
CREATE OR REPLACE FUNCTION compare_sessions(session1_uuid UUID, session2_uuid UUID)
RETURNS TABLE (
  session1_fastest_lap NUMERIC,
  session2_fastest_lap NUMERIC,
  time_difference NUMERIC,
  faster_session UUID,
  session1_avg_speed NUMERIC,
  session2_avg_speed NUMERIC,
  speed_difference NUMERIC
) AS $$
DECLARE
  s1_fastest NUMERIC;
  s2_fastest NUMERIC;
  s1_avg_speed NUMERIC;
  s2_avg_speed NUMERIC;
BEGIN
  -- Get fastest laps for both sessions
  SELECT lap_time INTO s1_fastest 
  FROM get_session_fastest_lap(session1_uuid);
  
  SELECT lap_time INTO s2_fastest 
  FROM get_session_fastest_lap(session2_uuid);
  
  -- Get average speeds
  SELECT (calculate_session_statistics(session1_uuid)->>'avg_speed_kmh')::NUMERIC INTO s1_avg_speed;
  SELECT (calculate_session_statistics(session2_uuid)->>'avg_speed_kmh')::NUMERIC INTO s2_avg_speed;
  
  session1_fastest_lap := s1_fastest;
  session2_fastest_lap := s2_fastest;
  time_difference := ABS(s1_fastest - s2_fastest);
  faster_session := CASE WHEN s1_fastest < s2_fastest THEN session1_uuid ELSE session2_uuid END;
  session1_avg_speed := s1_avg_speed;
  session2_avg_speed := s2_avg_speed;
  speed_difference := ABS(s1_avg_speed - s2_avg_speed);
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERSONAL BEST AND LEADERBOARD FUNCTIONS
-- =====================================================

-- Function to get user's personal best times per track
CREATE OR REPLACE FUNCTION get_user_personal_bests(user_uuid UUID)
RETURNS TABLE (
  track_name TEXT,
  fastest_lap_time NUMERIC,
  session_id UUID,
  session_date TIMESTAMPTZ,
  car_setup TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_sessions AS (
    SELECT s.id, s.track_name, s.session_date, s.car_setup
    FROM public.telemetry_sessions s
    WHERE s.user_id = user_uuid
  ),
  session_fastest_laps AS (
    SELECT 
      us.track_name,
      us.id as session_id,
      us.session_date,
      us.car_setup,
      (SELECT lap_time FROM get_session_fastest_lap(us.id)) as fastest_lap
    FROM user_sessions us
  ),
  personal_bests AS (
    SELECT 
      sfl.track_name,
      MIN(sfl.fastest_lap) as best_time,
      sfl.session_id,
      sfl.session_date,
      sfl.car_setup,
      ROW_NUMBER() OVER (PARTITION BY sfl.track_name ORDER BY sfl.fastest_lap ASC) as rn
    FROM session_fastest_laps sfl
    WHERE sfl.fastest_lap IS NOT NULL
    GROUP BY sfl.track_name, sfl.session_id, sfl.session_date, sfl.car_setup, sfl.fastest_lap
  )
  SELECT 
    pb.track_name,
    pb.best_time,
    pb.session_id,
    pb.session_date,
    pb.car_setup
  FROM personal_bests pb
  WHERE pb.rn = 1
  ORDER BY pb.track_name, pb.best_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get team leaderboards
CREATE OR REPLACE FUNCTION get_team_leaderboards(team_uuid UUID DEFAULT NULL, track_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  email TEXT,
  track_name TEXT,
  fastest_lap_time NUMERIC,
  session_date TIMESTAMPTZ,
  position INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH team_filter AS (
    SELECT u.id as user_id, u.username, u.email
    FROM public.users u
    WHERE (team_uuid IS NULL OR u.team_id = team_uuid)
  ),
  user_best_times AS (
    SELECT 
      tf.user_id,
      tf.username,
      tf.email,
      pb.track_name,
      pb.fastest_lap_time,
      pb.session_date
    FROM team_filter tf
    CROSS JOIN LATERAL get_user_personal_bests(tf.user_id) pb
    WHERE (track_filter IS NULL OR pb.track_name = track_filter)
  )
  SELECT 
    ubt.user_id,
    ubt.username,
    ubt.email,
    ubt.track_name,
    ubt.fastest_lap_time,
    ubt.session_date,
    ROW_NUMBER() OVER (PARTITION BY ubt.track_name ORDER BY ubt.fastest_lap_time ASC)::INTEGER as position
  FROM user_best_times ubt
  ORDER BY ubt.track_name, ubt.fastest_lap_time ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATIC FASTEST LAP MANAGEMENT
-- =====================================================

-- Function to update or insert fastest lap record
CREATE OR REPLACE FUNCTION upsert_fastest_lap(session_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  fastest_lap_record RECORD;
  session_info RECORD;
BEGIN
  -- Get session information
  SELECT user_id, track_name INTO session_info
  FROM public.telemetry_sessions
  WHERE id = session_uuid;
  
  IF session_info IS NULL THEN
    RAISE NOTICE 'Session % not found', session_uuid;
    RETURN FALSE;
  END IF;
  
  -- Get fastest lap for this session
  SELECT lap_time, lap_number INTO fastest_lap_record
  FROM get_session_fastest_lap(session_uuid);
  
  IF fastest_lap_record.lap_time IS NULL THEN
    RAISE NOTICE 'No valid lap time found for session %', session_uuid;
    RETURN FALSE;
  END IF;
  
  -- Insert or update fastest lap record
  INSERT INTO public.fastest_laps (
    session_id, 
    user_id, 
    track_name, 
    lap_time, 
    lap_number,
    created_at,
    updated_at
  ) VALUES (
    session_uuid,
    session_info.user_id,
    session_info.track_name,
    fastest_lap_record.lap_time,
    fastest_lap_record.lap_number,
    NOW(),
    NOW()
  )
  ON CONFLICT (session_id) 
  DO UPDATE SET 
    lap_time = EXCLUDED.lap_time,
    lap_number = EXCLUDED.lap_number,
    updated_at = NOW()
  WHERE fastest_laps.lap_time > EXCLUDED.lap_time OR fastest_laps.lap_time IS NULL;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to automatically update fastest laps when telemetry data is inserted
CREATE OR REPLACE FUNCTION trigger_update_fastest_lap()
RETURNS TRIGGER AS $$
BEGIN
  -- Update fastest lap for the session when new telemetry data is added
  PERFORM upsert_fastest_lap(NEW.session_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on telemetry_data table
DROP TRIGGER IF EXISTS update_fastest_lap_trigger ON public.telemetry_data;
CREATE TRIGGER update_fastest_lap_trigger
  AFTER INSERT ON public.telemetry_data
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_fastest_lap();

-- =====================================================
-- DATA CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up orphaned telemetry data
CREATE OR REPLACE FUNCTION cleanup_orphaned_telemetry_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete telemetry data where session no longer exists
  WITH deleted AS (
    DELETE FROM public.telemetry_data td
    WHERE NOT EXISTS (
      SELECT 1 FROM public.telemetry_sessions ts 
      WHERE ts.id = td.session_id
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Delete fastest laps where session no longer exists
  DELETE FROM public.fastest_laps fl
  WHERE NOT EXISTS (
    SELECT 1 FROM public.telemetry_sessions ts 
    WHERE ts.id = fl.session_id
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old temporary sessions (older than 24 hours with no telemetry data)
CREATE OR REPLACE FUNCTION cleanup_empty_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM public.telemetry_sessions ts
    WHERE ts.created_at < NOW() - INTERVAL '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.telemetry_data td 
      WHERE td.session_id = ts.id
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- =====================================================

-- Function to analyze table performance and suggest optimizations
CREATE OR REPLACE FUNCTION analyze_telemetry_performance()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT,
  index_usage TEXT,
  suggestions TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'telemetry_data'::TEXT,
    (SELECT COUNT(*) FROM public.telemetry_data)::BIGINT,
    pg_size_pretty(pg_total_relation_size('public.telemetry_data'))::TEXT,
    'Check session_id and timestamp indexes'::TEXT,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.telemetry_data) > 1000000 
      THEN 'Consider partitioning by date or session'
      ELSE 'Performance is acceptable'
    END::TEXT
  UNION ALL
  SELECT 
    'telemetry_sessions'::TEXT,
    (SELECT COUNT(*) FROM public.telemetry_sessions)::BIGINT,
    pg_size_pretty(pg_total_relation_size('public.telemetry_sessions'))::TEXT,
    'Check user_id and track_name indexes'::TEXT,
    'Monitor for session cleanup needs'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ERROR HANDLING AND LOGGING
-- =====================================================

-- Function to log database function errors
CREATE OR REPLACE FUNCTION log_function_error(
  function_name TEXT,
  error_message TEXT,
  context_data JSON DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Log error to a dedicated error log table (if it exists)
  -- For now, just raise a notice
  RAISE NOTICE 'Function: %, Error: %, Context: %', function_name, error_message, context_data;
  
  -- Could be extended to insert into an error_log table:
  -- INSERT INTO error_log (function_name, error_message, context_data, created_at)
  -- VALUES (function_name, error_message, context_data, NOW());
END;
$$ LANGUAGE plpgsql;

-- Wrapper function with error handling for lap time calculations
CREATE OR REPLACE FUNCTION safe_calculate_lap_times(session_uuid UUID)
RETURNS TABLE (
  lap_number INTEGER,
  lap_time NUMERIC,
  start_timestamp TIMESTAMPTZ,
  end_timestamp TIMESTAMPTZ,
  avg_speed NUMERIC,
  max_speed NUMERIC,
  total_distance NUMERIC
) AS $$
BEGIN
  BEGIN
    RETURN QUERY SELECT * FROM calculate_lap_times(session_uuid);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_function_error(
      'calculate_lap_times',
      SQLERRM,
      json_build_object('session_id', session_uuid)
    );
    RETURN;
  END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_telemetry_data_session_timestamp 
ON public.telemetry_data (session_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_telemetry_data_distance 
ON public.telemetry_data (session_id, distance_m);

CREATE INDEX IF NOT EXISTS idx_fastest_laps_user_track 
ON public.fastest_laps (user_id, track_name);

CREATE INDEX IF NOT EXISTS idx_fastest_laps_track_time 
ON public.fastest_laps (track_name, lap_time);

CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_user_track 
ON public.telemetry_sessions (user_id, track_name);

-- =====================================================
-- EXAMPLE USAGE QUERIES
-- =====================================================

/*
-- Calculate lap times for a session
SELECT * FROM calculate_lap_times('session-uuid-here');

-- Get session statistics
SELECT calculate_session_statistics('session-uuid-here');

-- Get user personal bests
SELECT * FROM get_user_personal_bests('user-uuid-here');

-- Get team leaderboard
SELECT * FROM get_team_leaderboards();

-- Get team leaderboard for specific track
SELECT * FROM get_team_leaderboards(NULL, 'Silverstone');

-- Compare two sessions
SELECT * FROM compare_sessions('session1-uuid', 'session2-uuid');

-- Clean up orphaned data
SELECT cleanup_orphaned_telemetry_data();

-- Clean up empty sessions
SELECT cleanup_empty_sessions();

-- Analyze performance
SELECT * FROM analyze_telemetry_performance();
*/ 