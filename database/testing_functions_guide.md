# Database Functions Testing Guide

This guide provides step-by-step instructions for testing the database functions created in migration `003_database_functions.sql`.

## Prerequisites

1. Ensure the database schema is set up (run `001_initial_schema.sql`)
2. Ensure storage is configured (see `storage_setup_guide.md`)
3. Run the functions migration: `003_database_functions.sql`

## Test Data Setup

Before testing functions, you'll need some sample data. Run these queries to create test data:

### Create Test Users and Team

```sql
-- Insert test team
INSERT INTO public.teams (id, name, description, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Test Racing Team',
  'Test team for function validation',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert test users
INSERT INTO public.users (id, username, email, team_id, created_at, updated_at)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'testdriver1',
    'driver1@test.com',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'testdriver2',
    'driver2@test.com',
    '550e8400-e29b-41d4-a716-446655440001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
```

### Create Test Sessions

```sql
-- Insert test sessions
INSERT INTO public.telemetry_sessions (id, user_id, track_name, session_date, weather_conditions, car_setup, created_at, updated_at)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440002',
    'Silverstone',
    NOW() - INTERVAL '1 day',
    'Sunny, 25°C',
    'Balanced setup',
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440003',
    'Silverstone',
    NOW() - INTERVAL '2 hours',
    'Cloudy, 20°C',
    'Aggressive setup',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;
```

### Create Test Telemetry Data

```sql
-- Insert sample telemetry data for session 1 (multiple laps)
INSERT INTO public.telemetry_data (session_id, timestamp, speed_kmh, distance_m, throttle_position, brake_pressure, steering_angle, gear)
VALUES 
  -- Lap 1 data points
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '5 minutes', '120.5', '0', '0.8', '0.0', '0.0', '4'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '4 minutes 30 seconds', '145.2', '500', '0.9', '0.0', '5.2', '5'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '4 minutes', '160.8', '1000', '1.0', '0.0', '-2.1', '6'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '3 minutes 30 seconds', '155.3', '1500', '0.7', '0.3', '8.5', '5'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '3 minutes', '140.1', '2000', '0.5', '0.5', '12.0', '4'),
  
  -- Lap 2 data points (faster lap)
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '2 minutes 30 seconds', '125.0', '2100', '0.8', '0.0', '0.0', '4'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '2 minutes', '150.0', '2600', '0.9', '0.0', '3.2', '5'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '1 minute 30 seconds', '165.5', '3100', '1.0', '0.0', '-1.8', '6'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '1 minute', '162.8', '3600', '0.8', '0.2', '6.2', '6'),
  ('550e8400-e29b-41d4-a716-446655440010', NOW() - INTERVAL '30 seconds', '145.2', '4100', '0.6', '0.4', '10.5', '5'),

  -- Session 2 data (different driver, same track)
  ('550e8400-e29b-41d4-a716-446655440011', NOW() - INTERVAL '1 hour', '118.0', '0', '0.7', '0.0', '0.0', '4'),
  ('550e8400-e29b-41d4-a716-446655440011', NOW() - INTERVAL '59 minutes', '142.5', '500', '0.8', '0.0', '4.2', '5'),
  ('550e8400-e29b-41d4-a716-446655440011', NOW() - INTERVAL '58 minutes', '158.2', '1000', '0.9', '0.0', '-1.5', '6'),
  ('550e8400-e29b-41d4-a716-446655440011', NOW() - INTERVAL '57 minutes', '152.1', '1500', '0.6', '0.4', '7.8', '5'),
  ('550e8400-e29b-41d4-a716-446655440011', NOW() - INTERVAL '56 minutes', '138.5', '2000', '0.4', '0.6', '15.2', '4')
ON CONFLICT DO NOTHING;
```

## Function Testing

### 1. Test Utility Functions

```sql
-- Test safe_numeric function
SELECT safe_numeric('123.45') as valid_number;  -- Should return 123.45
SELECT safe_numeric('invalid') as invalid_number;  -- Should return NULL
SELECT safe_numeric('') as empty_string;  -- Should return NULL

-- Test time_diff_seconds function
SELECT time_diff_seconds(NOW() - INTERVAL '1 hour', NOW()) as hour_diff;  -- Should return ~3600
```

### 2. Test Lap Time Calculation

```sql
-- Calculate lap times for test session
SELECT * FROM calculate_lap_times('550e8400-e29b-41d4-a716-446655440010');

-- Get fastest lap for session
SELECT * FROM get_session_fastest_lap('550e8400-e29b-41d4-a716-446655440010');
```

**Expected Results:**
- Should show lap times calculated based on distance thresholds
- Fastest lap should be the shortest time from the calculated laps

### 3. Test Session Statistics

```sql
-- Get comprehensive session statistics
SELECT calculate_session_statistics('550e8400-e29b-41d4-a716-446655440010');
```

**Expected Results:**
- JSON object containing total data points, session duration, speed statistics, lap counts, etc.

### 4. Test Session Comparison

```sql
-- Compare two test sessions
SELECT * FROM compare_sessions(
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011'
);
```

**Expected Results:**
- Comparison showing fastest lap times for both sessions and performance differences

### 5. Test Personal Best Functions

```sql
-- Get personal bests for test driver 1
SELECT * FROM get_user_personal_bests('550e8400-e29b-41d4-a716-446655440002');

-- Get personal bests for test driver 2
SELECT * FROM get_user_personal_bests('550e8400-e29b-41d4-a716-446655440003');
```

**Expected Results:**
- Personal best times per track for each user

### 6. Test Team Leaderboards

```sql
-- Get overall team leaderboard
SELECT * FROM get_team_leaderboards();

-- Get team leaderboard for specific team
SELECT * FROM get_team_leaderboards('550e8400-e29b-41d4-a716-446655440001');

-- Get leaderboard for specific track
SELECT * FROM get_team_leaderboards(NULL, 'Silverstone');
```

**Expected Results:**
- Ranked list of drivers with their fastest times per track

### 7. Test Fastest Lap Management

```sql
-- Manually trigger fastest lap update
SELECT upsert_fastest_lap('550e8400-e29b-41d4-a716-446655440010');

-- Check if fastest lap was recorded
SELECT * FROM public.fastest_laps WHERE session_id = '550e8400-e29b-41d4-a716-446655440010';
```

**Expected Results:**
- Function should return TRUE if successful
- Record should exist in fastest_laps table

### 8. Test Triggers

```sql
-- Insert new telemetry data to trigger automatic fastest lap update
INSERT INTO public.telemetry_data (session_id, timestamp, speed_kmh, distance_m, throttle_position, brake_pressure, steering_angle, gear)
VALUES ('550e8400-e29b-41d4-a716-446655440010', NOW(), '170.0', '4200', '1.0', '0.0', '0.0', '6');

-- Check if fastest lap was automatically updated
SELECT * FROM public.fastest_laps WHERE session_id = '550e8400-e29b-41d4-a716-446655440010';
```

**Expected Results:**
- Trigger should automatically update fastest lap when new telemetry data is inserted

### 9. Test Cleanup Functions

```sql
-- Test orphaned data cleanup (should return 0 with valid test data)
SELECT cleanup_orphaned_telemetry_data();

-- Test empty session cleanup (should return 0 with recent sessions)
SELECT cleanup_empty_sessions();
```

**Expected Results:**
- Functions should return 0 (no data to clean up) with valid test data

### 10. Test Performance Analysis

```sql
-- Analyze telemetry performance
SELECT * FROM analyze_telemetry_performance();
```

**Expected Results:**
- Performance metrics for telemetry tables

### 11. Test Error Handling

```sql
-- Test with invalid session UUID
SELECT * FROM safe_calculate_lap_times('00000000-0000-0000-0000-000000000000');
```

**Expected Results:**
- Should handle gracefully without crashing, returning empty result set

## Validation Checklist

- [ ] All utility functions work correctly
- [ ] Lap time calculation produces logical results
- [ ] Session statistics JSON is well-formatted and complete
- [ ] Session comparison shows meaningful differences
- [ ] Personal bests are correctly calculated per track
- [ ] Team leaderboards show proper rankings
- [ ] Fastest lap management functions work
- [ ] Triggers fire automatically on data insertion
- [ ] Cleanup functions execute without errors
- [ ] Performance analysis provides useful metrics
- [ ] Error handling prevents crashes on invalid input

## Performance Considerations

For large datasets (>100k telemetry records), monitor:

1. **Lap calculation performance** - Consider adding more indexes if slow
2. **Session statistics calculation** - May need optimization for large sessions
3. **Leaderboard queries** - Watch for N+1 query patterns

## Troubleshooting

### Common Issues

1. **No lap times calculated:** Check that telemetry data has proper distance progression
2. **Triggers not firing:** Verify trigger exists and function permissions are correct
3. **Empty statistics:** Ensure session has telemetry data
4. **Performance issues:** Run `ANALYZE` on tables after loading substantial data

### Debug Queries

```sql
-- Check if session has telemetry data
SELECT COUNT(*) FROM public.telemetry_data WHERE session_id = 'your-session-id';

-- Check data quality (distance progression)
SELECT timestamp, distance_m, speed_kmh 
FROM public.telemetry_data 
WHERE session_id = 'your-session-id' 
ORDER BY timestamp;

-- Verify triggers exist
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' AND event_object_table = 'telemetry_data';
```

## Next Steps

After successful testing:

1. Consider adding more complex test scenarios
2. Test with larger datasets if needed
3. Monitor function performance in production
4. Implement additional error logging if required 