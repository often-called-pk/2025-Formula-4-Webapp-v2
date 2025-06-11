-- Formula 4 Race Analytics - Seed Data
-- File: seed_data.sql
-- Description: Sample data for testing the database schema

-- Note: This seed data should be run AFTER creating test users via Supabase Auth
-- User IDs shown here are examples - replace with actual user IDs from auth.users

-- =====================================================
-- SAMPLE TEAMS
-- =====================================================

-- Example team data (replace user IDs with actual auth.users IDs)
INSERT INTO public.teams (id, name, description, country, created_by) VALUES
(
    uuid_generate_v4(),
    'Red Bull Racing Academy',
    'Junior development program for aspiring Formula drivers',
    'Austria',
    'user-id-placeholder-1'  -- Replace with actual user ID
),
(
    uuid_generate_v4(),
    'Mercedes F1 Academy',
    'Young driver development program focusing on technical excellence',
    'Germany',
    'user-id-placeholder-2'  -- Replace with actual user ID
),
(
    uuid_generate_v4(),
    'Indian Racing League',
    'Promoting motorsport talent from the Indian subcontinent',
    'India',
    'user-id-placeholder-3'  -- Replace with actual user ID
);

-- =====================================================
-- SAMPLE TELEMETRY SESSIONS
-- =====================================================

-- Sample telemetry sessions (replace user IDs with actual auth.users IDs)
INSERT INTO public.telemetry_sessions (
    id, user_id, team_id, session_name, track_name, car_model, 
    session_type, session_date, total_laps, best_lap_time, 
    total_distance, average_speed, max_speed, is_public
) VALUES
(
    uuid_generate_v4(),
    'user-id-placeholder-1',  -- Replace with actual user ID
    (SELECT id FROM public.teams WHERE name = 'Red Bull Racing Academy' LIMIT 1),
    'Practice Session 1',
    'Kari Motor Speedway',
    'Formula 4 - Tatuus F4-T014',
    'practice',
    '2024-03-15 10:30:00+00:00',
    12,
    89.547,
    28500.45,
    85.3,
    142.7,
    true
),
(
    uuid_generate_v4(),
    'user-id-placeholder-2',  -- Replace with actual user ID
    (SELECT id FROM public.teams WHERE name = 'Mercedes F1 Academy' LIMIT 1),
    'Qualifying Round 1',
    'Kari Motor Speedway',
    'Formula 4 - Tatuus F4-T014',
    'qualifying',
    '2024-03-15 14:00:00+00:00',
    8,
    88.923,
    19200.33,
    87.1,
    145.2,
    true
),
(
    uuid_generate_v4(),
    'user-id-placeholder-3',  -- Replace with actual user ID
    (SELECT id FROM public.teams WHERE name = 'Indian Racing League' LIMIT 1),
    'Race Session',
    'Kari Motor Speedway',
    'Formula 4 - Tatuus F4-T014',
    'race',
    '2024-03-16 15:30:00+00:00',
    20,
    90.124,
    48000.78,
    83.9,
    141.8,
    false
);

-- =====================================================
-- SAMPLE FASTEST LAPS
-- =====================================================

-- Sample fastest lap records
INSERT INTO public.fastest_laps (
    session_id, user_id, lap_number, lap_time, 
    sector_1_time, sector_2_time, sector_3_time,
    average_speed, max_speed, track_name, car_model,
    conditions, is_personal_best, is_track_record
) VALUES
(
    (SELECT id FROM public.telemetry_sessions WHERE session_name = 'Practice Session 1' LIMIT 1),
    'user-id-placeholder-1',  -- Replace with actual user ID
    7,
    89.547,
    28.234,
    31.891,
    29.422,
    87.3,
    142.7,
    'Kari Motor Speedway',
    'Formula 4 - Tatuus F4-T014',
    '{"weather": "sunny", "track_temp": 35.5, "air_temp": 28.0}',
    true,
    false
),
(
    (SELECT id FROM public.telemetry_sessions WHERE session_name = 'Qualifying Round 1' LIMIT 1),
    'user-id-placeholder-2',  -- Replace with actual user ID
    5,
    88.923,
    27.891,
    31.234,
    29.798,
    89.1,
    145.2,
    'Kari Motor Speedway',
    'Formula 4 - Tatuus F4-T014',
    '{"weather": "partly_cloudy", "track_temp": 32.8, "air_temp": 26.5}',
    true,
    true
);

-- =====================================================
-- SAMPLE TEAM MEMBERSHIPS
-- =====================================================

-- Sample team memberships (replace user IDs with actual auth.users IDs)
INSERT INTO public.team_memberships (team_id, user_id, role) VALUES
(
    (SELECT id FROM public.teams WHERE name = 'Red Bull Racing Academy' LIMIT 1),
    'user-id-placeholder-1',  -- Replace with actual user ID
    'owner'
),
(
    (SELECT id FROM public.teams WHERE name = 'Mercedes F1 Academy' LIMIT 1),
    'user-id-placeholder-2',  -- Replace with actual user ID
    'owner'
),
(
    (SELECT id FROM public.teams WHERE name = 'Indian Racing League' LIMIT 1),
    'user-id-placeholder-3',  -- Replace with actual user ID
    'owner'
);

-- =====================================================
-- SAMPLE TELEMETRY DATA POINTS
-- =====================================================

-- Sample telemetry data (simplified - in real scenarios this would be thousands of points)
-- This creates a few data points for the first session

DO $$
DECLARE
    session_id_var UUID;
    i INTEGER;
    time_val DECIMAL;
BEGIN
    -- Get the first session ID
    SELECT id INTO session_id_var FROM public.telemetry_sessions 
    WHERE session_name = 'Practice Session 1' LIMIT 1;
    
    -- Insert sample telemetry data points for one lap
    FOR i IN 0..100 LOOP
        time_val := i * 0.895; -- Approximately 89.5 second lap
        
        INSERT INTO public.telemetry_data (
            session_id, timestamp, lap_number, distance,
            engine_rpm, speed, gear, throttle_pos, brake_pos,
            steering_pos, lateral_acc, inline_acc,
            gps_latitude, gps_longitude, gps_altitude
        ) VALUES (
            session_id_var,
            time_val,
            1, -- Lap number
            i * 24.0, -- Distance progression
            
            -- Engine data with some variation
            2000 + (i * 50) + ROUND(RANDOM() * 3000),
            30 + (i * 1.1) + ROUND(RANDOM() * 20, 2),
            CASE 
                WHEN i < 10 THEN 1
                WHEN i < 30 THEN 2
                WHEN i < 50 THEN 3
                WHEN i < 80 THEN 4
                ELSE 3
            END,
            
            -- Throttle and brake (inverse relationship)
            CASE WHEN i % 20 < 15 THEN 85 + ROUND(RANDOM() * 15, 2) ELSE 20 + ROUND(RANDOM() * 30, 2) END,
            CASE WHEN i % 20 < 15 THEN 0 ELSE 60 + ROUND(RANDOM() * 40, 2) END,
            
            -- Steering and G-forces
            -45 + (i * 0.9) + ROUND(RANDOM() * 90, 2),
            -2.0 + ROUND(RANDOM() * 4.0, 4),
            -1.5 + ROUND(RANDOM() * 3.0, 4),
            
            -- GPS coordinates for Kari Motor Speedway area
            13.0011 + (RANDOM() - 0.5) * 0.01,
            79.9899 + (RANDOM() - 0.5) * 0.01,
            -30 + ROUND(RANDOM() * 10, 2)
        );
    END LOOP;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Use these queries to verify the seed data was inserted correctly

-- Check teams
-- SELECT name, country, created_at FROM public.teams;

-- Check sessions
-- SELECT session_name, track_name, session_type, best_lap_time FROM public.telemetry_sessions;

-- Check fastest laps
-- SELECT lap_time, track_name, is_personal_best, is_track_record FROM public.fastest_laps;

-- Check telemetry data count
-- SELECT session_id, COUNT(*) as data_points FROM public.telemetry_data GROUP BY session_id; 