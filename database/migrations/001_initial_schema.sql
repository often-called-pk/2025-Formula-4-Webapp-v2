-- Formula 4 Race Analytics 2025- Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Complete database schema for Formula 4 telemetry analysis platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE (extends auth.users)
-- =====================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    country TEXT,
    team_id UUID,
    role TEXT DEFAULT 'driver' CHECK (role IN ('driver', 'engineer', 'admin')),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    country TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TELEMETRY SESSIONS TABLE (Enhanced)
-- =====================================================
CREATE TABLE public.telemetry_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id),
    session_name TEXT NOT NULL,
    track_name TEXT NOT NULL,
    car_model TEXT,
    weather_conditions TEXT,
    track_temperature DECIMAL(5,2),
    air_temperature DECIMAL(5,2),
    session_type TEXT DEFAULT 'practice' CHECK (session_type IN ('practice', 'qualifying', 'race')),
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_laps INTEGER DEFAULT 0,
    best_lap_time DECIMAL(10,3),
    total_distance DECIMAL(12,3),
    average_speed DECIMAL(8,3),
    max_speed DECIMAL(8,3),
    file_url TEXT,
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TELEMETRY DATA TABLE (Enhanced)
-- =====================================================
CREATE TABLE public.telemetry_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    timestamp DECIMAL(10,3) NOT NULL,
    lap_number INTEGER,
    distance DECIMAL(12,3),
    
    -- Engine & Performance
    engine_rpm INTEGER,
    speed DECIMAL(8,3),
    gear INTEGER,
    throttle_pos DECIMAL(5,2),
    brake_pos DECIMAL(5,2),
    brake_press DECIMAL(8,3),
    clutch_pos DECIMAL(5,2),
    
    -- Engine Temperatures & Pressures
    water_temp DECIMAL(6,2),
    head_temp DECIMAL(6,2),
    exhaust_temp DECIMAL(6,2),
    oil_temp DECIMAL(6,2),
    oil_press DECIMAL(8,3),
    
    -- Vehicle Dynamics
    steering_pos DECIMAL(8,3),
    lateral_acc DECIMAL(8,4),
    inline_acc DECIMAL(8,4),
    vertical_acc DECIMAL(8,4),
    
    -- GPS Data
    gps_latitude DECIMAL(12,8),
    gps_longitude DECIMAL(12,8),
    gps_altitude DECIMAL(8,3),
    gps_speed DECIMAL(8,3),
    gps_heading DECIMAL(8,3),
    gps_gyro DECIMAL(8,3),
    gps_lat_acc DECIMAL(8,4),
    gps_lon_acc DECIMAL(8,4),
    gps_slope DECIMAL(8,3),
    gps_satellites INTEGER,
    gps_accuracy DECIMAL(8,3),
    
    -- Additional Sensors
    battery_voltage DECIMAL(5,2),
    fuel_level DECIMAL(5,2),
    lambda DECIMAL(8,4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FASTEST LAPS TABLE
-- =====================================================
CREATE TABLE public.fastest_laps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lap_number INTEGER NOT NULL,
    lap_time DECIMAL(10,3) NOT NULL,
    sector_1_time DECIMAL(10,3),
    sector_2_time DECIMAL(10,3),
    sector_3_time DECIMAL(10,3),
    average_speed DECIMAL(8,3),
    max_speed DECIMAL(8,3),
    track_name TEXT NOT NULL,
    car_model TEXT,
    conditions JSONB DEFAULT '{}',
    is_personal_best BOOLEAN DEFAULT false,
    is_track_record BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TEAM MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE public.team_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'engineer', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_team_id ON public.users(team_id);
CREATE INDEX idx_users_role ON public.users(role);

-- Teams indexes
CREATE INDEX idx_teams_created_by ON public.teams(created_by);
CREATE INDEX idx_teams_name ON public.teams(name);

-- Telemetry sessions indexes
CREATE INDEX idx_telemetry_sessions_user_id ON public.telemetry_sessions(user_id);
CREATE INDEX idx_telemetry_sessions_team_id ON public.telemetry_sessions(team_id);
CREATE INDEX idx_telemetry_sessions_track_name ON public.telemetry_sessions(track_name);
CREATE INDEX idx_telemetry_sessions_session_date ON public.telemetry_sessions(session_date);
CREATE INDEX idx_telemetry_sessions_best_lap ON public.telemetry_sessions(track_name, best_lap_time);
CREATE INDEX idx_telemetry_sessions_public ON public.telemetry_sessions(is_public) WHERE is_public = true;

-- Telemetry data indexes (critical for performance)
CREATE INDEX idx_telemetry_data_session_id ON public.telemetry_data(session_id);
CREATE INDEX idx_telemetry_data_timestamp ON public.telemetry_data(session_id, timestamp);
CREATE INDEX idx_telemetry_data_lap_number ON public.telemetry_data(session_id, lap_number);
CREATE INDEX idx_telemetry_data_distance ON public.telemetry_data(session_id, distance);
CREATE INDEX idx_telemetry_data_gps ON public.telemetry_data(gps_latitude, gps_longitude);

-- Fastest laps indexes
CREATE INDEX idx_fastest_laps_session_id ON public.fastest_laps(session_id);
CREATE INDEX idx_fastest_laps_user_id ON public.fastest_laps(user_id);
CREATE INDEX idx_fastest_laps_track ON public.fastest_laps(track_name, lap_time);
CREATE INDEX idx_fastest_laps_personal_best ON public.fastest_laps(user_id, track_name, lap_time) WHERE is_personal_best = true;

-- Team memberships indexes
CREATE INDEX idx_team_memberships_team_id ON public.team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON public.team_memberships(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastest_laps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view team members" ON public.users
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Teams policies
CREATE POLICY "Anyone can view teams" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "Team owners can update teams" ON public.teams
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Telemetry sessions policies
CREATE POLICY "Users can view their own sessions" ON public.telemetry_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view public sessions" ON public.telemetry_sessions
    FOR SELECT USING (is_public = true);

CREATE POLICY "Team members can view team sessions" ON public.telemetry_sessions
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own sessions" ON public.telemetry_sessions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.telemetry_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions" ON public.telemetry_sessions
    FOR DELETE USING (user_id = auth.uid());

-- Telemetry data policies
CREATE POLICY "Users can view their own telemetry data" ON public.telemetry_data
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.telemetry_sessions 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view public session telemetry data" ON public.telemetry_data
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.telemetry_sessions 
            WHERE is_public = true
        )
    );

CREATE POLICY "Team members can view team telemetry data" ON public.telemetry_data
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.telemetry_sessions 
            WHERE team_id IN (
                SELECT team_id FROM public.team_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert telemetry data for their sessions" ON public.telemetry_data
    FOR INSERT WITH CHECK (
        session_id IN (
            SELECT id FROM public.telemetry_sessions 
            WHERE user_id = auth.uid()
        )
    );

-- Fastest laps policies
CREATE POLICY "Anyone can view fastest laps" ON public.fastest_laps
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own fastest laps" ON public.fastest_laps
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Team memberships policies
CREATE POLICY "Team members can view memberships" ON public.team_memberships
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM public.team_memberships 
            WHERE user_id = auth.uid()
        ) OR user_id = auth.uid()
    );

CREATE POLICY "Team owners can manage memberships" ON public.team_memberships
    FOR ALL USING (
        team_id IN (
            SELECT id FROM public.teams 
            WHERE created_by = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON public.teams 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telemetry_sessions_updated_at 
    BEFORE UPDATE ON public.telemetry_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to handle user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Add foreign key constraint for users.team_id (after team_memberships table is created)
ALTER TABLE public.users 
ADD CONSTRAINT fk_users_team_id 
FOREIGN KEY (team_id) REFERENCES public.teams(id); 
