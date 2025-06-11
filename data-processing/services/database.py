import os
import json
from typing import Optional, List, Any, Dict
from sqlalchemy import create_engine, pool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
import redis
from datetime import datetime, timedelta
import logging

from models.database_models import Base, Driver, Track, Session as DBSession, Lap, TelemetryPoint, ComparisonResult, ProcessingJob
from models.telemetry_models import SessionData, LapData, TelemetryDataPoint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration class"""
    
    def __init__(self):
        # PostgreSQL configuration
        self.database_url = os.getenv(
            "DATABASE_URL", 
            "postgresql://postgres:password@localhost:5432/formula4_telemetry"
        )
        
        # Redis configuration  
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.cache_ttl = int(os.getenv("CACHE_TTL", "3600"))  # 1 hour default
        
        # Connection pool settings
        self.pool_size = int(os.getenv("DB_POOL_SIZE", "10"))
        self.max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        self.pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "3600"))

class DatabaseManager:
    """Centralized database management"""
    
    def __init__(self, config: DatabaseConfig = None):
        self.config = config or DatabaseConfig()
        self.engine = None
        self.SessionLocal = None
        self.redis_client = None
        self._setup_database()
        self._setup_redis()
    
    def _setup_database(self):
        """Initialize database connection and engine"""
        try:
            self.engine = create_engine(
                self.config.database_url,
                poolclass=pool.QueuePool,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_recycle=self.config.pool_recycle,
                echo=False  # Set to True for SQL debugging
            )
            
            self.SessionLocal = sessionmaker(
                autocommit=False, 
                autoflush=False, 
                bind=self.engine
            )
            
            logger.info("Database connection established successfully")
            
        except Exception as e:
            logger.error(f"Failed to setup database: {e}")
            raise
    
    def _setup_redis(self):
        """Initialize Redis connection for caching"""
        try:
            self.redis_client = redis.from_url(
                self.config.redis_url,
                decode_responses=True,
                health_check_interval=30
            )
            
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established successfully")
            
        except Exception as e:
            logger.warning(f"Failed to setup Redis: {e}. Caching will be disabled.")
            self.redis_client = None
    
    def create_tables(self):
        """Create all database tables"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            raise
    
    @contextmanager
    def get_db_session(self):
        """Get database session with automatic cleanup"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def health_check(self) -> Dict[str, Any]:
        """Check database and cache health"""
        health = {
            "database": {"status": "unknown"},
            "cache": {"status": "unknown"}
        }
        
        # Check database
        try:
            with self.get_db_session() as session:
                session.execute("SELECT 1")
                health["database"] = {"status": "healthy"}
        except Exception as e:
            health["database"] = {"status": "unhealthy", "error": str(e)}
        
        # Check Redis
        try:
            if self.redis_client:
                self.redis_client.ping()
                health["cache"] = {"status": "healthy"}
            else:
                health["cache"] = {"status": "disabled"}
        except Exception as e:
            health["cache"] = {"status": "unhealthy", "error": str(e)}
        
        return health

class SessionRepository:
    """Repository for session-related database operations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def create_session_from_data(self, session_data: SessionData, file_info: Dict) -> int:
        """Create a new session record from SessionData"""
        with self.db_manager.get_db_session() as session:
            # Get or create driver
            driver = session.query(Driver).filter(
                Driver.name == session_data.driver_name
            ).first()
            
            if not driver:
                driver = Driver(
                    name=session_data.driver_name,
                    championship=session_data.metadata.get('Championship'),
                    vehicle_number=session_data.metadata.get('Vehicle')
                )
                session.add(driver)
                session.flush()  # Get the ID
            
            # Get or create track (if track info available)
            track = None
            track_name = session_data.track_name
            if track_name and track_name != 'Unknown':
                track = session.query(Track).filter(Track.name == track_name).first()
                if not track:
                    track = Track(name=track_name)
                    session.add(track)
                    session.flush()
            
            # Create session record
            db_session = DBSession(
                driver_id=driver.id,
                track_id=track.id if track else None,
                session_name=session_data.session_name or "Unknown Session",
                championship=session_data.metadata.get('Championship'),
                vehicle=session_data.metadata.get('Vehicle'),
                total_duration=session_data.metadata.get('Duration'),
                sample_rate=session_data.metadata.get('Sample Rate', 20),
                file_name=file_info.get('filename'),
                file_size=file_info.get('size'),
                metadata=session_data.metadata
            )
            
            session.add(db_session)
            session.flush()  # Get the session ID
            
            # Create lap records
            for lap_data in session_data.laps:
                lap_record = self._create_lap_record(db_session.id, lap_data)
                session.add(lap_record)
                session.flush()
                
                # Create telemetry points (batch insert for performance)
                telemetry_points = [
                    self._create_telemetry_point(lap_record.id, point, lap_data.start_time)
                    for point in lap_data.data_points
                ]
                session.bulk_save_objects(telemetry_points)
            
            return db_session.id
    
    def _create_lap_record(self, session_id: int, lap_data: LapData) -> Lap:
        """Create a lap record from LapData"""
        # Calculate lap statistics
        speeds = [p.speed for p in lap_data.data_points if p.speed]
        max_speed = max(speeds) if speeds else None
        min_speed = min(speeds) if speeds else None
        avg_speed = sum(speeds) / len(speeds) if speeds else None
        
        return Lap(
            session_id=session_id,
            lap_number=lap_data.lap_number,
            start_time=lap_data.start_time,
            end_time=lap_data.end_time,
            lap_time=lap_data.lap_time,
            is_fastest=lap_data.is_fastest,
            max_speed=max_speed,
            min_speed=min_speed,
            avg_speed=avg_speed,
            distance_covered=None  # Could be calculated from telemetry
        )
    
    def _create_telemetry_point(self, lap_id: int, point: TelemetryDataPoint, lap_start: float) -> TelemetryPoint:
        """Create a telemetry point record"""
        return TelemetryPoint(
            lap_id=lap_id,
            timestamp=point.time,
            speed=point.speed,
            throttle_pos=point.throttle_pos,
            brake_pos=point.brake_pos,
            gear=point.gear,
            rpm=point.rpm,
            gps_latitude=point.gps_latitude,
            gps_longitude=point.gps_longitude,
            water_temp=point.water_temp,
            oil_temp=point.oil_temp
        )
    
    def get_session_by_id(self, session_id: int) -> Optional[DBSession]:
        """Get session by ID"""
        with self.db_manager.get_db_session() as session:
            return session.query(DBSession).filter(DBSession.id == session_id).first()
    
    def get_sessions_by_driver(self, driver_name: str, limit: int = 50) -> List[DBSession]:
        """Get sessions for a specific driver"""
        with self.db_manager.get_db_session() as session:
            return session.query(DBSession).join(Driver).filter(
                Driver.name == driver_name
            ).order_by(DBSession.created_at.desc()).limit(limit).all()
    
    def get_recent_sessions(self, limit: int = 20) -> List[DBSession]:
        """Get recent sessions across all drivers"""
        with self.db_manager.get_db_session() as session:
            return session.query(DBSession).order_by(
                DBSession.created_at.desc()
            ).limit(limit).all()

class CacheManager:
    """Redis-based caching manager"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.redis_client = db_manager.redis_client
        self.ttl = db_manager.config.cache_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        if not self.redis_client:
            return None
        
        try:
            value = self.redis_client.get(key)
            return json.loads(value) if value else None
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set cached value"""
        if not self.redis_client:
            return False
        
        try:
            json_value = json.dumps(value, default=str)  # Handle datetime objects
            ttl = ttl or self.ttl
            return self.redis_client.setex(key, ttl, json_value)
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete cached value"""
        if not self.redis_client:
            return False
        
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
            return False
    
    def get_comparison_cache_key(self, session1_id: int, session2_id: int, 
                                lap1: Optional[int] = None, lap2: Optional[int] = None) -> str:
        """Generate cache key for comparison results"""
        lap_key = f"_{lap1}_{lap2}" if lap1 is not None and lap2 is not None else "_fastest"
        return f"comparison:{session1_id}:{session2_id}{lap_key}"
    
    def get_session_cache_key(self, session_id: int) -> str:
        """Generate cache key for session data"""
        return f"session:{session_id}"

# Global database manager instance
db_manager: Optional[DatabaseManager] = None

def get_database_manager() -> DatabaseManager:
    """Get the global database manager instance"""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager

def initialize_database():
    """Initialize database and create tables if needed"""
    manager = get_database_manager()
    manager.create_tables()
    return manager 