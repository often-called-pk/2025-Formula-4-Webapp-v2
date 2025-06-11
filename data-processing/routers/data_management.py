from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional, Dict, Any
import pandas as pd
import io
from datetime import datetime, timedelta

from services.database import get_database_manager, SessionRepository, CacheManager, DatabaseManager
from services.data_processor import TelemetryProcessor
from models.telemetry_models import SessionData, ProcessingResult, AnalysisResult
from models.database_models import Session as DBSession, Driver, Track, ComparisonResult, ProcessingJob

router = APIRouter(prefix="/data", tags=["data-management"])

# Dependency injection
def get_db_manager() -> DatabaseManager:
    return get_database_manager()

def get_session_repo(db_manager: DatabaseManager = Depends(get_db_manager)) -> SessionRepository:
    return SessionRepository(db_manager)

def get_cache_manager(db_manager: DatabaseManager = Depends(get_db_manager)) -> CacheManager:
    return CacheManager(db_manager)

# Initialize processor
processor = TelemetryProcessor()

@router.post("/upload-session")
async def upload_and_store_session(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    driver_name: Optional[str] = Form(None),
    session_name: Optional[str] = Form(None),
    track_name: Optional[str] = Form(None),
    session_repo: SessionRepository = Depends(get_session_repo),
    cache_manager: CacheManager = Depends(get_cache_manager)
):
    """
    Upload CSV telemetry file and store processed data in database
    
    This endpoint processes the CSV file, extracts telemetry data,
    and stores it persistently for future analysis and comparison.
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        # Read and process the CSV file
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        # Extract metadata and process telemetry
        metadata, df_clean = processor._extract_metadata(df)
        df_clean = processor.data_cleaner.clean_data(df_clean)
        laps = processor.lap_detector.detect_laps_from_metadata(metadata, df_clean)
        fastest_lap = processor.lap_detector.get_fastest_lap(laps)
        
        # Override metadata with form data if provided
        if driver_name:
            metadata['Racer'] = driver_name
        if session_name:
            metadata['Session'] = session_name
        if track_name:
            metadata['Track'] = track_name
        
        # Create session data
        session_data = SessionData(
            driver_name=metadata.get('Racer', 'Unknown Driver'),
            session_name=metadata.get('Session', 'Unknown Session'),
            track_name=metadata.get('Track', 'Unknown Track'),
            laps=laps,
            fastest_lap=fastest_lap,
            metadata=metadata
        )
        
        # File information
        file_info = {
            'filename': file.filename,
            'size': len(content)
        }
        
        # Store in database
        session_id = session_repo.create_session_from_data(session_data, file_info)
        
        # Cache the session data
        cache_key = cache_manager.get_session_cache_key(session_id)
        cache_manager.set(cache_key, session_data.dict())
        
        return {
            "success": True,
            "message": f"Session stored successfully with {len(laps)} laps",
            "session_id": session_id,
            "driver_name": session_data.driver_name,
            "laps_detected": len(laps),
            "fastest_lap_time": fastest_lap.lap_time if fastest_lap else None,
            "total_duration": metadata.get('Duration'),
            "file_size": len(content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload and storage error: {str(e)}")

@router.get("/sessions")
async def get_sessions(
    driver_name: Optional[str] = Query(None, description="Filter by driver name"),
    limit: int = Query(20, ge=1, le=100, description="Number of sessions to return"),
    session_repo: SessionRepository = Depends(get_session_repo)
):
    """
    Get stored telemetry sessions with optional filtering
    """
    try:
        if driver_name:
            sessions = session_repo.get_sessions_by_driver(driver_name, limit)
        else:
            sessions = session_repo.get_recent_sessions(limit)
        
        return {
            "success": True,
            "sessions": [
                {
                    "id": session.id,
                    "driver_name": session.driver.name if session.driver else "Unknown",
                    "session_name": session.session_name,
                    "track_name": session.track.name if session.track else "Unknown",
                    "championship": session.championship,
                    "session_date": session.session_date,
                    "total_laps": len(session.laps),
                    "fastest_lap_time": min([lap.lap_time for lap in session.laps]) if session.laps else None,
                    "file_name": session.file_name,
                    "created_at": session.created_at
                }
                for session in sessions
            ],
            "total": len(sessions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving sessions: {str(e)}")

@router.get("/sessions/{session_id}")
async def get_session_details(
    session_id: int,
    include_telemetry: bool = Query(False, description="Include full telemetry data"),
    session_repo: SessionRepository = Depends(get_session_repo),
    cache_manager: CacheManager = Depends(get_cache_manager)
):
    """
    Get detailed information about a specific session
    """
    try:
        # Check cache first
        cache_key = cache_manager.get_session_cache_key(session_id)
        cached_data = cache_manager.get(cache_key)
        
        if cached_data and not include_telemetry:
            return {
                "success": True,
                "session": cached_data,
                "source": "cache"
            }
        
        # Get from database
        session = session_repo.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session_data = {
            "id": session.id,
            "driver_name": session.driver.name if session.driver else "Unknown",
            "session_name": session.session_name,
            "track_name": session.track.name if session.track else "Unknown",
            "championship": session.championship,
            "vehicle": session.vehicle,
            "session_date": session.session_date,
            "total_duration": session.total_duration,
            "sample_rate": session.sample_rate,
            "file_name": session.file_name,
            "file_size": session.file_size,
            "metadata": session.metadata,
            "laps": [
                {
                    "lap_number": lap.lap_number,
                    "lap_time": lap.lap_time,
                    "is_fastest": lap.is_fastest,
                    "max_speed": lap.max_speed,
                    "avg_speed": lap.avg_speed,
                    "distance_covered": lap.distance_covered,
                    "telemetry_points": len(lap.telemetry_points) if include_telemetry else None,
                    "telemetry_data": [
                        {
                            "timestamp": point.timestamp,
                            "speed": point.speed,
                            "throttle_pos": point.throttle_pos,
                            "brake_pos": point.brake_pos,
                            "gear": point.gear,
                            "rpm": point.rpm,
                            "gps_latitude": point.gps_latitude,
                            "gps_longitude": point.gps_longitude
                        }
                        for point in lap.telemetry_points
                    ] if include_telemetry else None
                }
                for lap in session.laps
            ],
            "created_at": session.created_at
        }
        
        # Cache the result (without telemetry data for performance)
        if not include_telemetry:
            cache_manager.set(cache_key, session_data)
        
        return {
            "success": True,
            "session": session_data,
            "source": "database"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving session details: {str(e)}")

@router.post("/compare-sessions")
async def compare_stored_sessions(
    session1_id: int = Form(..., description="First session ID"),
    session2_id: int = Form(..., description="Second session ID"), 
    lap1_number: Optional[int] = Form(None, description="Specific lap from session 1"),
    lap2_number: Optional[int] = Form(None, description="Specific lap from session 2"),
    use_cache: bool = Form(True, description="Use cached results if available"),
    session_repo: SessionRepository = Depends(get_session_repo),
    cache_manager: CacheManager = Depends(get_cache_manager),
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Compare two stored sessions with caching and database persistence
    """
    try:
        # Check cache first
        cache_key = cache_manager.get_comparison_cache_key(
            session1_id, session2_id, lap1_number, lap2_number
        )
        
        if use_cache:
            cached_result = cache_manager.get(cache_key)
            if cached_result:
                return {
                    **cached_result,
                    "source": "cache"
                }
        
        # Get sessions from database
        session1 = session_repo.get_session_by_id(session1_id)
        session2 = session_repo.get_session_by_id(session2_id)
        
        if not session1 or not session2:
            raise HTTPException(status_code=404, detail="One or both sessions not found")
        
        # Convert database sessions to SessionData objects
        session1_data = _convert_db_session_to_session_data(session1)
        session2_data = _convert_db_session_to_session_data(session2)
        
        # Perform comparison
        comparison_result = processor.compare_sessions_detailed(
            session1_data, session2_data,
            use_fastest_laps=(lap1_number is None and lap2_number is None),
            specific_lap1=lap1_number,
            specific_lap2=lap2_number
        )
        
        if not comparison_result.get("success"):
            raise HTTPException(status_code=400, detail=comparison_result.get("error", "Comparison failed"))
        
        # Store comparison result in database
        with db_manager.get_db_session() as db_session:
            comparison_record = ComparisonResult(
                session1_id=session1_id,
                session2_id=session2_id,
                lap1_number=lap1_number,
                lap2_number=lap2_number,
                comparison_type="specific_lap" if lap1_number or lap2_number else "fastest_lap",
                total_distance=comparison_result.get("alignment_info", {}).get("total_distance"),
                data_points=comparison_result.get("alignment_info", {}).get("data_points"),
                time_difference=comparison_result.get("comparison_metrics", {}).get("time_comparison", {}).get("time_delta_end"),
                faster_driver=comparison_result.get("driver1", {}).get("name") if comparison_result.get("comparison_metrics", {}).get("time_comparison", {}).get("time_delta_end", 0) < 0 else comparison_result.get("driver2", {}).get("name"),
                speed_comparison=comparison_result.get("comparison_metrics", {}).get("speed_comparison"),
                sector_analysis=comparison_result.get("sector_analysis"),
                cornering_analysis=comparison_result.get("cornering_analysis"),
                alignment_data=comparison_result.get("aligned_data"),
                expires_at=datetime.utcnow() + timedelta(hours=24)  # Cache for 24 hours
            )
            
            db_session.add(comparison_record)
            db_session.commit()
        
        # Cache the result
        cache_manager.set(cache_key, comparison_result, ttl=86400)  # 24 hours
        
        return {
            **comparison_result,
            "source": "computed",
            "cached": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison error: {str(e)}")

@router.get("/drivers")
async def get_drivers(
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Get list of all drivers with session counts
    """
    try:
        with db_manager.get_db_session() as session:
            drivers = session.query(Driver).all()
            
            driver_data = []
            for driver in drivers:
                driver_data.append({
                    "id": driver.id,
                    "name": driver.name,
                    "team": driver.team,
                    "vehicle_number": driver.vehicle_number,
                    "championship": driver.championship,
                    "session_count": len(driver.sessions),
                    "latest_session": max([s.created_at for s in driver.sessions]) if driver.sessions else None,
                    "created_at": driver.created_at
                })
            
            return {
                "success": True,
                "drivers": driver_data,
                "total": len(driver_data)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving drivers: {str(e)}")

@router.get("/tracks")
async def get_tracks(
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Get list of all tracks with session counts
    """
    try:
        with db_manager.get_db_session() as session:
            tracks = session.query(Track).all()
            
            track_data = []
            for track in tracks:
                track_data.append({
                    "id": track.id,
                    "name": track.name,
                    "location": track.location,
                    "length_meters": track.length_meters,
                    "sectors": track.sectors,
                    "session_count": len(track.sessions),
                    "latest_session": max([s.created_at for s in track.sessions]) if track.sessions else None,
                    "created_at": track.created_at
                })
            
            return {
                "success": True,
                "tracks": track_data,
                "total": len(track_data)
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving tracks: {str(e)}")

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    session_repo: SessionRepository = Depends(get_session_repo),
    cache_manager: CacheManager = Depends(get_cache_manager),
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Delete a stored session and all associated data
    """
    try:
        with db_manager.get_db_session() as session:
            db_session = session.query(DBSession).filter(DBSession.id == session_id).first()
            if not db_session:
                raise HTTPException(status_code=404, detail="Session not found")
            
            # Delete from database (cascading will handle laps and telemetry points)
            session.delete(db_session)
            session.commit()
            
            # Remove from cache
            cache_key = cache_manager.get_session_cache_key(session_id)
            cache_manager.delete(cache_key)
            
            return {
                "success": True,
                "message": f"Session {session_id} deleted successfully"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")

@router.get("/health")
async def health_check(
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Check health of database and cache systems
    """
    return db_manager.health_check()

def _convert_db_session_to_session_data(db_session: DBSession) -> SessionData:
    """Convert database session to SessionData object"""
    from models.telemetry_models import LapData, TelemetryDataPoint
    
    laps = []
    fastest_lap = None
    
    for lap in db_session.laps:
        # Convert telemetry points
        data_points = [
            TelemetryDataPoint(
                time=point.timestamp,
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
            for point in lap.telemetry_points
        ]
        
        lap_data = LapData(
            lap_number=lap.lap_number,
            start_time=lap.start_time,
            end_time=lap.end_time,
            lap_time=lap.lap_time,
            data_points=data_points,
            is_fastest=lap.is_fastest
        )
        
        laps.append(lap_data)
        if lap.is_fastest:
            fastest_lap = lap_data
    
    return SessionData(
        driver_name=db_session.driver.name if db_session.driver else "Unknown",
        session_name=db_session.session_name,
        track_name=db_session.track.name if db_session.track else "Unknown",
        laps=laps,
        fastest_lap=fastest_lap,
        metadata=db_session.metadata or {}
    ) 