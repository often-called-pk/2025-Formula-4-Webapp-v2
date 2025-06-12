from fastapi import APIRouter, HTTPException, Depends, Form, Query, Request
from typing import Dict, Any, Optional
import logging
import numpy as np

from services.database import get_database_manager, SessionRepository, CacheManager, DatabaseManager
from services.data_processor import TelemetryProcessor
from models.telemetry_models import SessionData
from middleware.auth import get_current_user, comparison_rate_limit, basic_rate_limit

router = APIRouter(prefix="/comparison", tags=["advanced-comparison"])
logger = logging.getLogger(__name__)

# Dependency injection
def get_db_manager() -> DatabaseManager:
    return get_database_manager()

def get_session_repo(db_manager: DatabaseManager = Depends(get_db_manager)) -> SessionRepository:
    return SessionRepository(db_manager)

def get_cache_manager(db_manager: DatabaseManager = Depends(get_db_manager)) -> CacheManager:
    return CacheManager(db_manager)

# Initialize processor
processor = TelemetryProcessor()

@router.post("/advanced-analysis")
async def perform_advanced_session_comparison(
    session1_id: int = Form(..., description="First session ID"),
    session2_id: int = Form(..., description="Second session ID"),
    use_fastest_laps: bool = Form(True, description="Use fastest laps for comparison"),
    lap1_number: Optional[int] = Form(None, description="Specific lap from session 1"),
    lap2_number: Optional[int] = Form(None, description="Specific lap from session 2"),
    include_detailed_points: bool = Form(False, description="Include detailed comparison points"),
    session_repo: SessionRepository = Depends(get_session_repo),
    cache_manager: CacheManager = Depends(get_cache_manager),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(comparison_rate_limit)
):
    """
    Perform advanced comparison analysis between two stored sessions
    
    This endpoint provides comprehensive analysis including:
    - Driver action classification (throttle, braking, coasting patterns)
    - Vehicle dynamics analysis (oversteer/understeer detection)
    - Track sector performance breakdown
    - Speed analysis and time delta calculations
    - Performance metrics and driving style comparison
    """
    try:
        # Check cache first
        cache_key = f"advanced_comparison:{session1_id}:{session2_id}:{use_fastest_laps}:{lap1_number}:{lap2_number}"
        cached_result = cache_manager.get(cache_key)
        
        if cached_result:
            logger.info(f"Returning cached advanced comparison for sessions {session1_id} vs {session2_id}")
            return {
                **cached_result,
                "source": "cache",
                "user": current_user.get("email", current_user.get("sub", "unknown"))
            }
        
        # Get sessions from database
        session1 = session_repo.get_session_by_id(session1_id)
        session2 = session_repo.get_session_by_id(session2_id)
        
        if not session1 or not session2:
            raise HTTPException(status_code=404, detail="One or both sessions not found")
        
        # Convert database sessions to SessionData objects
        session1_data = _convert_db_session_to_session_data(session1)
        session2_data = _convert_db_session_to_session_data(session2)
        
        # Perform advanced comparison
        comparison_result = processor.perform_advanced_comparison(
            session1_data, session2_data, use_fastest_laps, lap1_number, lap2_number
        )
        
        if not comparison_result.get("success"):
            raise HTTPException(status_code=400, detail=comparison_result.get("error", "Comparison failed"))
        
        # Remove detailed points if not requested (for performance)
        if not include_detailed_points:
            comparison_result.pop("detailed_comparison_points", None)
        
        # Add metadata
        comparison_result.update({
            "source": "computed",
            "user": current_user.get("email", current_user.get("sub", "unknown")),
            "session_metadata": {
                "session1": {
                    "id": session1.id,
                    "file_name": session1.file_name,
                    "created_at": session1.created_at.isoformat(),
                    "total_laps": len(session1.laps)
                },
                "session2": {
                    "id": session2.id,
                    "file_name": session2.file_name,
                    "created_at": session2.created_at.isoformat(),
                    "total_laps": len(session2.laps)
                }
            }
        })
        
        # Cache the result for 4 hours
        cache_manager.set(cache_key, comparison_result, ttl=14400)
        
        return comparison_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Advanced comparison error: {e}")
        raise HTTPException(status_code=500, detail=f"Advanced comparison error: {str(e)}")

@router.get("/performance-metrics/{session_id}")
async def get_session_performance_metrics(
    session_id: int,
    lap_number: Optional[int] = Query(None, description="Specific lap number (uses fastest if not provided)"),
    session_repo: SessionRepository = Depends(get_session_repo),
    cache_manager: CacheManager = Depends(get_cache_manager),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(basic_rate_limit)
):
    """
    Get detailed performance metrics for a specific session
    
    Provides comprehensive analysis including:
    - Speed statistics and consistency
    - Throttle and brake usage patterns
    - Driver action classification
    - Vehicle dynamics characteristics
    - Data quality metrics
    """
    try:
        # Check cache first
        cache_key = f"performance_metrics:{session_id}:{lap_number}"
        cached_result = cache_manager.get(cache_key)
        
        if cached_result:
            return {
                **cached_result,
                "source": "cache"
            }
        
        # Get session from database
        session = session_repo.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Convert to SessionData object
        session_data = _convert_db_session_to_session_data(session)
        
        # Get performance metrics
        metrics_result = processor.get_performance_metrics(session_data, lap_number)
        
        if not metrics_result.get("success"):
            raise HTTPException(status_code=400, detail=metrics_result.get("error", "Metrics calculation failed"))
        
        # Add session metadata
        metrics_result.update({
            "source": "computed",
            "session_metadata": {
                "id": session.id,
                "file_name": session.file_name,
                "championship": session.championship,
                "track_name": session.track.name if session.track else "Unknown",
                "created_at": session.created_at.isoformat(),
                "total_laps": len(session.laps)
            }
        })
        
        # Cache for 2 hours
        cache_manager.set(cache_key, metrics_result, ttl=7200)
        
        return metrics_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Performance metrics error: {e}")
        raise HTTPException(status_code=500, detail=f"Performance metrics error: {str(e)}")

@router.get("/driver-comparison/{driver1_name}/{driver2_name}")
async def compare_drivers_across_sessions(
    driver1_name: str,
    driver2_name: str,
    track_name: Optional[str] = Query(None, description="Filter by specific track"),
    limit: int = Query(5, ge=1, le=20, description="Number of recent sessions to compare"),
    use_fastest_laps: bool = Query(True, description="Use fastest laps for comparison"),
    session_repo: SessionRepository = Depends(get_session_repo),
    cache_manager: CacheManager = Depends(get_cache_manager),
    db_manager: DatabaseManager = Depends(get_db_manager),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(comparison_rate_limit)
):
    """
    Compare two drivers across multiple sessions
    
    Analyzes performance trends and characteristics across multiple sessions
    to provide insights into driver strengths, weaknesses, and consistency.
    """
    try:
        # Check cache first
        cache_key = f"driver_comparison:{driver1_name}:{driver2_name}:{track_name}:{limit}:{use_fastest_laps}"
        cached_result = cache_manager.get(cache_key)
        
        if cached_result:
            return {
                **cached_result,
                "source": "cache"
            }
        
        # Get sessions for both drivers
        driver1_sessions = session_repo.get_sessions_by_driver(driver1_name, limit)
        driver2_sessions = session_repo.get_sessions_by_driver(driver2_name, limit)
        
        if not driver1_sessions or not driver2_sessions:
            raise HTTPException(
                status_code=404, 
                detail=f"Not enough sessions found for comparison. Driver 1: {len(driver1_sessions)}, Driver 2: {len(driver2_sessions)}"
            )
        
        # Filter by track if specified
        if track_name:
            driver1_sessions = [s for s in driver1_sessions if s.track and s.track.name == track_name]
            driver2_sessions = [s for s in driver2_sessions if s.track and s.track.name == track_name]
        
        if not driver1_sessions or not driver2_sessions:
            raise HTTPException(
                status_code=404, 
                detail=f"No sessions found for track '{track_name}'"
            )
        
        # Perform comparisons between matching sessions
        comparisons = []
        comparison_summary = {
            "driver1_wins": 0,
            "driver2_wins": 0,
            "total_comparisons": 0,
            "avg_time_delta": 0,
            "driver1_consistency": [],
            "driver2_consistency": []
        }
        
        # Compare sessions (limit to avoid timeout)
        max_comparisons = min(len(driver1_sessions), len(driver2_sessions), 3)
        
        for i in range(max_comparisons):
            session1 = driver1_sessions[i]
            session2 = driver2_sessions[i]
            
            try:
                # Convert to SessionData
                session1_data = _convert_db_session_to_session_data(session1)
                session2_data = _convert_db_session_to_session_data(session2)
                
                # Perform comparison
                comparison = processor.perform_advanced_comparison(
                    session1_data, session2_data, use_fastest_laps
                )
                
                if comparison.get("success"):
                    comparisons.append({
                        "session1_id": session1.id,
                        "session2_id": session2.id,
                        "session1_date": session1.created_at.isoformat(),
                        "session2_date": session2.created_at.isoformat(),
                        "time_delta": comparison["overall_metrics"]["total_time_delta"],
                        "faster_driver": comparison["overall_metrics"]["faster_driver"],
                        "speed_analysis": comparison["speed_analysis"],
                        "sector_summary": len(comparison["sector_analysis"])
                    })
                    
                    # Update summary
                    time_delta = comparison["overall_metrics"]["total_time_delta"]
                    if time_delta < 0:
                        comparison_summary["driver1_wins"] += 1
                    else:
                        comparison_summary["driver2_wins"] += 1
                    
                    comparison_summary["avg_time_delta"] += time_delta
                    comparison_summary["total_comparisons"] += 1
                    
            except Exception as e:
                logger.warning(f"Failed to compare sessions {session1.id} vs {session2.id}: {e}")
                continue
        
        if comparison_summary["total_comparisons"] > 0:
            comparison_summary["avg_time_delta"] /= comparison_summary["total_comparisons"]
        
        # Calculate consistency metrics
        driver1_lap_times = []
        driver2_lap_times = []
        
        for session in driver1_sessions[:max_comparisons]:
            if use_fastest_laps:
                fastest_lap = min(session.laps, key=lambda x: x.lap_time) if session.laps else None
                if fastest_lap:
                    driver1_lap_times.append(fastest_lap.lap_time)
        
        for session in driver2_sessions[:max_comparisons]:
            if use_fastest_laps:
                fastest_lap = min(session.laps, key=lambda x: x.lap_time) if session.laps else None
                if fastest_lap:
                    driver2_lap_times.append(fastest_lap.lap_time)
        
        comparison_summary["driver1_consistency"] = {
            "avg_lap_time": sum(driver1_lap_times) / len(driver1_lap_times) if driver1_lap_times else 0,
            "std_deviation": np.std(driver1_lap_times) if len(driver1_lap_times) > 1 else 0,
            "best_lap_time": min(driver1_lap_times) if driver1_lap_times else 0
        }
        
        comparison_summary["driver2_consistency"] = {
            "avg_lap_time": sum(driver2_lap_times) / len(driver2_lap_times) if driver2_lap_times else 0,
            "std_deviation": np.std(driver2_lap_times) if len(driver2_lap_times) > 1 else 0,
            "best_lap_time": min(driver2_lap_times) if driver2_lap_times else 0
        }
        
        result = {
            "success": True,
            "driver1_name": driver1_name,
            "driver2_name": driver2_name,
            "track_filter": track_name,
            "comparison_summary": comparison_summary,
            "individual_comparisons": comparisons,
            "sessions_analyzed": {
                "driver1_sessions": len(driver1_sessions),
                "driver2_sessions": len(driver2_sessions),
                "successful_comparisons": len(comparisons)
            },
            "source": "computed"
        }
        
        # Cache for 6 hours
        cache_manager.set(cache_key, result, ttl=21600)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Driver comparison error: {e}")
        raise HTTPException(status_code=500, detail=f"Driver comparison error: {str(e)}")

@router.get("/comparison-capabilities")
async def get_comparison_capabilities(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    _: None = Depends(basic_rate_limit)
):
    """
    Get available comparison engine capabilities and features
    """
    return {
        "success": True,
        "advanced_analysis_features": [
            "Driver action classification (throttle, braking, coasting patterns)",
            "Vehicle dynamics analysis (oversteer/understeer detection)",
            "Track sector performance breakdown",
            "Speed analysis and time delta calculations",
            "Performance metrics and driving style comparison",
            "Multi-session driver comparison",
            "Consistency analysis across sessions"
        ],
        "driver_actions": [
            "Full throttle detection (>95% threshold)",
            "Partial throttle application",
            "Coasting periods",
            "Braking zones",
            "Trail braking detection"
        ],
        "vehicle_dynamics": [
            "Neutral handling",
            "Oversteer detection",
            "Understeer detection",
            "Correction moments",
            "Handling balance analysis"
        ],
        "performance_metrics": [
            "Speed statistics (max, min, average, consistency)",
            "Throttle usage patterns",
            "Braking intensity and frequency",
            "Gear shift analysis",
            "Sector timing breakdown",
            "Corner speed analysis",
            "Braking point detection"
        ],
        "comparison_types": [
            "Fastest lap comparison",
            "Specific lap comparison",
            "Multi-session driver analysis",
            "Track-specific performance comparison"
        ],
        "data_requirements": [
            "Speed data",
            "Throttle position",
            "Brake position", 
            "Gear information",
            "RPM data",
            "GPS coordinates (for distance calculation)"
        ],
        "caching": {
            "performance_metrics": "2 hours",
            "advanced_comparisons": "4 hours", 
            "driver_comparisons": "6 hours"
        },
        "rate_limits": {
            "basic_endpoints": "100 requests/hour",
            "comparison_endpoints": "20 requests/hour"
        }
    }

def _convert_db_session_to_session_data(db_session) -> SessionData:
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