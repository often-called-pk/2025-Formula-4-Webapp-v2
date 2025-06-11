-- Formula 4 Race Analytics Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create telemetry_sessions table
CREATE TABLE telemetry_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL,
    driver_name TEXT NOT NULL,
    session_name TEXT NOT NULL,
    lap_time DECIMAL(10,3),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create telemetry_data table
CREATE TABLE telemetry_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
    time DECIMAL(10,3) NOT NULL,
    speed DECIMAL(8,3),
    distance DECIMAL(10,3),
    throttle_pos DECIMAL(5,2),
    gear INTEGER,
    clutch_pos DECIMAL(5,2),
    brake_pos DECIMAL(5,2),
    brake_press DECIMAL(8,3),
    oil_temp DECIMAL(6,2),
    oil_press DECIMAL(8,3),
    exhaust_temp DECIMAL(6,2),
    water_temp DECIMAL(6,2),
    head_temp DECIMAL(6,2),
    steering_pos DECIMAL(8,3),
    gps_latitude DECIMAL(12,8),
    gps_longitude DECIMAL(12,8),
    gps_altitude DECIMAL(8,3),
    gps_gyro DECIMAL(8,3),
    gps_lateral_accel DECIMAL(8,4),
    gps_longitudinal_accel DECIMAL(8,4),
    lateral_accel DECIMAL(8,4),
    inline_accel DECIMAL(8,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_telemetry_sessions_analysis_id ON telemetry_sessions(analysis_id);
CREATE INDEX idx_telemetry_sessions_created_at ON telemetry_sessions(created_at);
CREATE INDEX idx_telemetry_data_session_id ON telemetry_data(session_id);
CREATE INDEX idx_telemetry_data_time ON telemetry_data(session_id, time);
CREATE INDEX idx_telemetry_data_distance ON telemetry_data(session_id, distance);

-- Add RLS (Row Level Security) policies for Supabase
ALTER TABLE telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_data ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can insert their own telemetry sessions" ON telemetry_sessions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view all telemetry sessions" ON telemetry_sessions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert telemetry data" ON telemetry_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view all telemetry data" ON telemetry_data
    FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for telemetry_sessions
CREATE TRIGGER update_telemetry_sessions_updated_at 
    BEFORE UPDATE ON telemetry_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 