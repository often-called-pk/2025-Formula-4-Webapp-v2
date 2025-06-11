# Formula 4 Race Analytics - Database Schema Documentation

## Overview

This document describes the complete database schema for the Formula 4 Race Analytics platform. The schema is designed for Supabase (PostgreSQL) and includes comprehensive Row Level Security (RLS) policies, indexes for performance optimization, and automated triggers.

## Architecture Principles

- **Multi-tenancy**: Users can belong to teams and share data within teams
- **Security First**: Comprehensive RLS policies ensure data isolation
- **Performance Optimized**: Strategic indexes for time-series telemetry data
- **Scalable**: Designed to handle large volumes of telemetry data points
- **Flexible**: JSONB fields for extensible metadata storage

## Database Tables

### 1. Users Table (`public.users`)

Extends Supabase's built-in `auth.users` table with additional profile information.

```sql
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
```

**Key Features:**
- Automatic user creation via trigger when auth.users record is created
- Flexible role system (driver, engineer, admin)
- Preferences stored as JSONB for extensibility
- Foreign key relationship to teams

**Security:**
- Users can view/update their own profiles
- Team members can view each other's basic profiles

### 2. Teams Table (`public.teams`)

Manages racing teams and organizations.

```sql
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
```

**Key Features:**
- Unique team names globally
- Rich metadata (logo, website, country)
- Team ownership tracking

**Security:**
- Anyone can view teams (public visibility)
- Only team creators can update team information
- Authenticated users can create new teams

### 3. Team Memberships Table (`public.team_memberships`)

Junction table managing user-team relationships with roles.

```sql
CREATE TABLE public.team_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'engineer', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);
```

**Key Features:**
- Hierarchical roles within teams
- Prevents duplicate memberships
- Automatic cleanup on user/team deletion

**Security:**
- Team members can view membership lists
- Team owners can manage all memberships

### 4. Telemetry Sessions Table (`public.telemetry_sessions`)

Stores metadata for racing sessions and telemetry recording sessions.

```sql
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
```

**Key Features:**
- Rich session metadata (weather, track conditions, etc.)
- Pre-calculated statistics (best lap, averages)
- Public/private visibility control
- Extensible metadata via JSONB

**Security:**
- Users can view their own sessions
- Team members can view shared team sessions
- Public sessions visible to everyone
- Full CRUD operations for session owners

### 5. Telemetry Data Table (`public.telemetry_data`)

Stores time-series telemetry data points from racing sessions.

```sql
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
```

**Key Features:**
- Comprehensive telemetry data coverage
- High-precision decimal types for accuracy
- GPS coordinates for track mapping
- Optimized for time-series queries

**Performance Considerations:**
- Multiple strategic indexes for common query patterns
- Partitioning recommended for very large datasets
- Consider data archival strategy for old sessions

**Security:**
- Access tied to session ownership and visibility
- Supports team-based sharing
- Public session data viewable by all

### 6. Fastest Laps Table (`public.fastest_laps`)

Stores computed fastest lap records and leaderboards.

```sql
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
```

**Key Features:**
- Sector timing breakdown
- Personal best and track record flags
- Conditions metadata for fair comparisons
- Leaderboard-optimized structure

**Security:**
- Public visibility for competitive transparency
- Only authenticated users can submit times

## Indexes and Performance

### Critical Indexes

1. **Telemetry Data Performance**:
   ```sql
   CREATE INDEX idx_telemetry_data_session_id ON public.telemetry_data(session_id);
   CREATE INDEX idx_telemetry_data_timestamp ON public.telemetry_data(session_id, timestamp);
   CREATE INDEX idx_telemetry_data_distance ON public.telemetry_data(session_id, distance);
   ```

2. **GPS Queries**:
   ```sql
   CREATE INDEX idx_telemetry_data_gps ON public.telemetry_data(gps_latitude, gps_longitude);
   ```

3. **Lap Time Leaderboards**:
   ```sql
   CREATE INDEX idx_fastest_laps_track ON public.fastest_laps(track_name, lap_time);
   CREATE INDEX idx_fastest_laps_personal_best ON public.fastest_laps(user_id, track_name, lap_time) WHERE is_personal_best = true;
   ```

### Query Optimization Tips

1. **Time-series queries**: Always include session_id in WHERE clauses
2. **Lap analysis**: Use distance-based queries for sector analysis
3. **Leaderboards**: Leverage track_name indexes for fast lookups
4. **GPS tracking**: Use bounding box queries for track section analysis

## Row Level Security (RLS)

### Security Model

The database implements a comprehensive RLS model with three access levels:

1. **Private**: User can only access their own data
2. **Team-based**: Team members can access shared team data
3. **Public**: Everyone can access publicly marked data

### Key Security Policies

1. **Users**: Can view/edit own profile + team member profiles
2. **Teams**: Public visibility, owner-only editing
3. **Sessions**: Owner + team-based + public sharing
4. **Telemetry Data**: Inherits session visibility rules
5. **Fastest Laps**: Public leaderboard visibility

## Database Functions and Triggers

### Automatic User Creation

```sql
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
```

### Updated_at Triggers

Automatically updates timestamp fields on record modifications.

## Migration and Deployment

### Initial Setup

1. **Create Supabase Project**: Set up new project in Supabase dashboard
2. **Run Migration**: Execute `001_initial_schema.sql` in SQL Editor
3. **Load Seed Data**: Run `seed_data.sql` for testing (optional)
4. **Verify Setup**: Run verification queries

### Schema Updates

- Use numbered migration files: `002_add_feature.sql`, etc.
- Always include rollback procedures
- Test migrations on staging environment first
- Document breaking changes

## Storage Buckets

### Required Buckets

1. **telemetry-files**: Raw telemetry CSV uploads
   - Size limit: 50MB per file
   - Allowed types: .csv, .json, .txt
   - RLS: Users can upload/access own files

2. **user-avatars**: Profile pictures
   - Size limit: 5MB per file
   - Allowed types: .jpg, .png, .gif
   - RLS: Users can upload/access own avatars

### Bucket Policies

- Authenticated users only
- File type validation
- Size limits enforced
- Automatic cleanup for old files

## Data Types and Precision

### Decimal Precision Guidelines

- **Lap times**: DECIMAL(10,3) - millisecond precision
- **Speeds**: DECIMAL(8,3) - km/h with decimal precision
- **GPS coordinates**: DECIMAL(12,8) - GPS precision
- **Temperatures**: DECIMAL(6,2) - Celsius with decimal
- **Pressures**: DECIMAL(8,3) - Bar pressure with precision
- **G-forces**: DECIMAL(8,4) - High precision for acceleration

### Performance Considerations

- Use appropriate decimal precision to balance accuracy and storage
- Consider using INTEGER for RPM (whole numbers)
- JSONB for flexible metadata storage
- UUID for all primary keys

## Future Considerations

### Scaling Strategies

1. **Partitioning**: Partition telemetry_data by session_id or date
2. **Archival**: Archive old telemetry data to separate tables
3. **Read Replicas**: Use read replicas for analytics queries
4. **Caching**: Implement Redis caching for frequent queries

### Feature Extensions

1. **Weather Integration**: Add weather API integration
2. **Video Sync**: Add video timestamp correlation
3. **Comparative Analysis**: Enhanced multi-session comparison
4. **Real-time Data**: WebSocket integration for live telemetry

## Troubleshooting

### Common Issues

1. **RLS Blocking Queries**: Check auth.uid() is properly set
2. **Slow Telemetry Queries**: Ensure session_id is in WHERE clause
3. **Foreign Key Violations**: Verify user/team relationships
4. **Storage Upload Failures**: Check bucket policies and file types

### Debugging Queries

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'telemetry_sessions';

-- Monitor query performance
EXPLAIN ANALYZE SELECT * FROM telemetry_data WHERE session_id = $1;

-- Check user permissions
SELECT auth.uid(), auth.role();
``` 