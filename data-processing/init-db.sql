-- Formula 4 Telemetry Database Initialization Script
-- This script sets up the database with optimizations for telemetry data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create indexes for performance optimization (will be created by SQLAlchemy, but good to have as backup)
-- Note: SQLAlchemy will handle the actual table creation

-- Create a function to clean up old processing jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
    DELETE FROM processing_jobs 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql;

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE formula4_telemetry TO postgres;

-- Set timezone
SET timezone = 'UTC';

-- Optimize PostgreSQL settings for telemetry data
-- These are recommendations, actual settings should be tuned based on hardware
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
-- ALTER SYSTEM SET max_connections = '200';
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';
-- ALTER SYSTEM SET checkpoint_completion_target = '0.9';
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = '100';

-- Create initial data or setup if needed
-- This will be handled by the application

COMMENT ON DATABASE formula4_telemetry IS 'Formula 4 Telemetry Analysis Database - Stores session data, lap times, telemetry points, and comparison results'; 