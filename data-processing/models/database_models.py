from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional

Base = declarative_base()

class Driver(Base):
    """Driver information table"""
    __tablename__ = "drivers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    team = Column(String(100), nullable=True)
    vehicle_number = Column(String(20), nullable=True)
    championship = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sessions = relationship("Session", back_populates="driver")
    
    def __repr__(self):
        return f"<Driver(id={self.id}, name='{self.name}')>"

class Track(Base):
    """Track information table"""
    __tablename__ = "tracks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    location = Column(String(100), nullable=True)
    length_meters = Column(Float, nullable=True)
    sectors = Column(Integer, default=3)
    layout_data = Column(JSON, nullable=True)  # Store track layout coordinates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sessions = relationship("Session", back_populates="track")
    
    def __repr__(self):
        return f"<Track(id={self.id}, name='{self.name}')>"

class Session(Base):
    """Telemetry session information"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=True, index=True)
    session_name = Column(String(100), nullable=False)
    session_date = Column(DateTime(timezone=True), nullable=True)
    championship = Column(String(100), nullable=True)
    vehicle = Column(String(100), nullable=True)
    weather_conditions = Column(String(100), nullable=True)
    total_duration = Column(Float, nullable=True)  # Session duration in seconds
    sample_rate = Column(Integer, default=20)  # Hz
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)  # File size in bytes
    metadata = Column(JSON, nullable=True)  # Store original CSV metadata
    processed_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    driver = relationship("Driver", back_populates="sessions")
    track = relationship("Track", back_populates="sessions")
    laps = relationship("Lap", back_populates="session", cascade="all, delete-orphan")
    comparisons = relationship("ComparisonResult", 
                              foreign_keys="ComparisonResult.session1_id",
                              back_populates="session1")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_session_driver_date', 'driver_id', 'session_date'),
        Index('idx_session_track_date', 'track_id', 'session_date'),
    )
    
    def __repr__(self):
        return f"<Session(id={self.id}, driver='{self.driver.name if self.driver else 'Unknown'}', session='{self.session_name}')>"

class Lap(Base):
    """Individual lap information"""
    __tablename__ = "laps"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    lap_number = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False)  # Seconds from session start
    end_time = Column(Float, nullable=False)
    lap_time = Column(Float, nullable=False)  # Lap duration in seconds
    is_fastest = Column(Boolean, default=False, index=True)
    is_valid = Column(Boolean, default=True)  # Track limits, yellow flags, etc.
    max_speed = Column(Float, nullable=True)  # km/h
    min_speed = Column(Float, nullable=True)  # km/h
    avg_speed = Column(Float, nullable=True)  # km/h
    distance_covered = Column(Float, nullable=True)  # meters
    sector_times = Column(JSON, nullable=True)  # Store sector split times
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("Session", back_populates="laps")
    telemetry_points = relationship("TelemetryPoint", back_populates="lap", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_lap_session_number', 'session_id', 'lap_number'),
        Index('idx_lap_fastest', 'session_id', 'is_fastest'),
        Index('idx_lap_time', 'session_id', 'lap_time'),
    )
    
    def __repr__(self):
        return f"<Lap(id={self.id}, session_id={self.session_id}, lap_number={self.lap_number}, time={self.lap_time:.3f}s)>"

class TelemetryPoint(Base):
    """Individual telemetry data points"""
    __tablename__ = "telemetry_points"
    
    id = Column(Integer, primary_key=True, index=True)
    lap_id = Column(Integer, ForeignKey("laps.id"), nullable=False, index=True)
    timestamp = Column(Float, nullable=False)  # Seconds from session start
    distance = Column(Float, nullable=True)  # Meters from start/finish line
    
    # Primary telemetry channels
    speed = Column(Float, nullable=True)  # km/h
    throttle_pos = Column(Float, nullable=True)  # 0-100%
    brake_pos = Column(Float, nullable=True)  # 0-100%
    gear = Column(Integer, nullable=True)  # 1-8
    rpm = Column(Float, nullable=True)  # RPM
    
    # Position data
    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)
    gps_speed = Column(Float, nullable=True)  # km/h from GPS
    
    # Temperature data
    water_temp = Column(Float, nullable=True)  # Celsius
    oil_temp = Column(Float, nullable=True)  # Celsius
    air_temp = Column(Float, nullable=True)  # Celsius
    
    # Vehicle dynamics (if available)
    lateral_acceleration = Column(Float, nullable=True)  # g-force
    longitudinal_acceleration = Column(Float, nullable=True)  # g-force
    steering_angle = Column(Float, nullable=True)  # degrees
    
    # Additional channels stored as JSON for flexibility
    additional_data = Column(JSON, nullable=True)
    
    # Relationships
    lap = relationship("Lap", back_populates="telemetry_points")
    
    # Indexes for time-series queries
    __table_args__ = (
        Index('idx_telemetry_lap_time', 'lap_id', 'timestamp'),
        Index('idx_telemetry_lap_distance', 'lap_id', 'distance'),
    )
    
    def __repr__(self):
        return f"<TelemetryPoint(id={self.id}, lap_id={self.lap_id}, time={self.timestamp:.3f}s, speed={self.speed})>"

class ComparisonResult(Base):
    """Stored comparison analysis results"""
    __tablename__ = "comparison_results"
    
    id = Column(Integer, primary_key=True, index=True)
    session1_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    session2_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    lap1_number = Column(Integer, nullable=True)  # None means fastest lap
    lap2_number = Column(Integer, nullable=True)  # None means fastest lap
    
    # Comparison metadata
    comparison_type = Column(String(50), default="fastest_lap")  # fastest_lap, specific_lap
    total_distance = Column(Float, nullable=True)  # meters
    data_points = Column(Integer, nullable=True)  # Number of aligned points
    
    # High-level results
    time_difference = Column(Float, nullable=True)  # seconds (session1 - session2)
    faster_driver = Column(String(100), nullable=True)  # driver name
    max_speed_diff = Column(Float, nullable=True)  # km/h
    avg_speed_diff = Column(Float, nullable=True)  # km/h
    
    # Detailed analysis results stored as JSON
    speed_comparison = Column(JSON, nullable=True)
    sector_analysis = Column(JSON, nullable=True)
    cornering_analysis = Column(JSON, nullable=True)
    alignment_data = Column(JSON, nullable=True)  # For visualization
    
    # Cache control
    expires_at = Column(DateTime(timezone=True), nullable=True)  # For cache invalidation
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session1 = relationship("Session", foreign_keys=[session1_id])
    session2 = relationship("Session", foreign_keys=[session2_id])
    
    # Indexes for comparison queries
    __table_args__ = (
        Index('idx_comparison_sessions', 'session1_id', 'session2_id'),
        Index('idx_comparison_laps', 'session1_id', 'session2_id', 'lap1_number', 'lap2_number'),
        Index('idx_comparison_created', 'created_at'),
    )
    
    def __repr__(self):
        return f"<ComparisonResult(id={self.id}, sessions=({self.session1_id}, {self.session2_id}), time_diff={self.time_difference})>"

class ProcessingJob(Base):
    """Track background processing jobs"""
    __tablename__ = "processing_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(50), nullable=False, index=True)  # csv_upload, comparison, etc.
    status = Column(String(20), default="pending", index=True)  # pending, processing, completed, failed
    progress = Column(Integer, default=0)  # 0-100%
    
    # Job parameters
    input_data = Column(JSON, nullable=True)  # Store job parameters
    result_data = Column(JSON, nullable=True)  # Store job results
    error_message = Column(Text, nullable=True)
    
    # Associated records
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    comparison_id = Column(Integer, ForeignKey("comparison_results.id"), nullable=True)
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Cleanup old jobs
    __table_args__ = (
        Index('idx_job_status_created', 'status', 'created_at'),
        Index('idx_job_type_status', 'job_type', 'status'),
    )
    
    def __repr__(self):
        return f"<ProcessingJob(id={self.id}, type='{self.job_type}', status='{self.status}')>" 