from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List, Optional
import pandas as pd
import numpy as np
import io
from models.telemetry_models import ProcessingResult, AnalysisResult
from services.data_processor import TelemetryProcessor

router = APIRouter(prefix="/telemetry", tags=["telemetry"])
processor = TelemetryProcessor()

@router.post("/process", response_model=ProcessingResult)
async def process_telemetry_file(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """
    Process uploaded CSV telemetry file
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")
        
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        
        result = processor.process_single_file(df, file.filename, session_id)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_telemetry_data(files: List[UploadFile] = File(...)):
    """
    Analyze multiple telemetry files for comparison
    """
    try:
        if len(files) != 2:
            raise HTTPException(status_code=400, detail="Exactly 2 files required for comparison")
        
        dataframes = []
        filenames = []
        
        for file in files:
            content = await file.read()
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            dataframes.append(df)
            filenames.append(file.filename)
        
        result = processor.analyze_comparison(dataframes, filenames)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@router.post("/compare-detailed")
async def compare_sessions_detailed(
    files: List[UploadFile] = File(...),
    use_fastest_laps: bool = Form(True),
    lap1_number: Optional[int] = Form(None),
    lap2_number: Optional[int] = Form(None)
):
    """
    Perform detailed comparison between two sessions with data alignment and advanced metrics
    
    Args:
        files: Exactly 2 CSV telemetry files
        use_fastest_laps: Whether to use fastest laps for comparison (default: True)
        lap1_number: Specific lap number from first file (overrides fastest lap)
        lap2_number: Specific lap number from second file (overrides fastest lap)
    
    Returns:
        Detailed comparison including aligned data, speed/throttle/brake analysis, 
        sector performance, and cornering metrics
    """
    try:
        if len(files) != 2:
            raise HTTPException(status_code=400, detail="Exactly 2 files required for detailed comparison")
        
        # Process both files to get session data
        sessions = []
        for file in files:
            content = await file.read()
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            
            # Extract metadata and process
            metadata, df_clean = processor._extract_metadata(df)
            df_clean = processor.data_cleaner.clean_data(df_clean)
            laps = processor.lap_detector.detect_laps_from_metadata(metadata, df_clean)
            fastest_lap = processor.lap_detector.get_fastest_lap(laps)
            
            # Create session data
            from models.telemetry_models import SessionData
            session_data = SessionData(
                driver_name=metadata.get('Racer', f'Driver {len(sessions) + 1}'),
                session_name=metadata.get('Session', 'Unknown'),
                track_name=metadata.get('Session', 'Unknown'),
                laps=laps,
                fastest_lap=fastest_lap,
                metadata=metadata
            )
            sessions.append(session_data)
        
        # Perform detailed comparison
        result = processor.compare_sessions_detailed(
            sessions[0], sessions[1], 
            use_fastest_laps, lap1_number, lap2_number
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detailed comparison error: {str(e)}")

@router.post("/lap-comparison-data")
async def get_lap_comparison_data(
    files: List[UploadFile] = File(...),
    lap1_number: Optional[int] = Form(None),
    lap2_number: Optional[int] = Form(None)
):
    """
    Get aligned lap data for visualization and analysis
    
    Args:
        files: Exactly 2 CSV telemetry files
        lap1_number: Specific lap number from first file (uses fastest if None)
        lap2_number: Specific lap number from second file (uses fastest if None)
    
    Returns:
        Aligned telemetry data formatted for frontend visualization including
        distance-based alignment for speed, throttle, brake, gear, and RPM channels
    """
    try:
        if len(files) != 2:
            raise HTTPException(status_code=400, detail="Exactly 2 files required for lap comparison")
        
        # Process both files to get session data
        sessions = []
        for file in files:
            content = await file.read()
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            
            # Extract metadata and process
            metadata, df_clean = processor._extract_metadata(df)
            df_clean = processor.data_cleaner.clean_data(df_clean)
            laps = processor.lap_detector.detect_laps_from_metadata(metadata, df_clean)
            fastest_lap = processor.lap_detector.get_fastest_lap(laps)
            
            # Create session data
            from models.telemetry_models import SessionData
            session_data = SessionData(
                driver_name=metadata.get('Racer', f'Driver {len(sessions) + 1}'),
                session_name=metadata.get('Session', 'Unknown'),
                track_name=metadata.get('Session', 'Unknown'),
                laps=laps,
                fastest_lap=fastest_lap,
                metadata=metadata
            )
            sessions.append(session_data)
        
        # Get lap comparison data
        result = processor.get_lap_comparison_data(
            sessions[0], sessions[1], lap1_number, lap2_number
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lap comparison data error: {str(e)}")

@router.get("/capabilities")
def get_capabilities():
    """
    Get telemetry processing capabilities
    """
    return {
        "supported_formats": ["CSV"],
        "analysis_types": [
            "Fastest lap extraction",
            "Driver comparison",
            "Speed analysis",
            "Sector timing",
            "Distance-based data alignment",
            "Cornering performance analysis",
            "Throttle and brake comparison",
            "Advanced comparative metrics"
        ],
        "data_columns": [
            "Time", "Speed", "Distance", "Throttle", "Brake",
            "Gear", "RPM", "Water Temp", "Oil Temp", "GPS"
        ],
        "alignment_features": [
            "GPS-based distance calculation",
            "Speed-based distance fallback",
            "10-meter interpolation spacing",
            "Multi-channel data alignment"
        ],
        "comparison_metrics": [
            "Speed differences and advantage zones",
            "Time delta analysis",
            "Throttle aggression comparison",
            "Braking point analysis",
            "Sector-based performance",
            "Corner exit acceleration",
            "Cornering zone identification"
        ]
    } 