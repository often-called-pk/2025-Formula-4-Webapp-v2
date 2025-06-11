from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class HealthResponse(BaseModel):
    status: str
    message: str
    service: str

class ProcessingResult(BaseModel):
    success: bool
    message: str
    filename: str
    rows_processed: Optional[int] = None
    fastest_lap_time: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class FileAnalysis(BaseModel):
    filename: str
    rows: int
    columns: List[str]
    time_range: Optional[Dict[str, float]] = None
    speed_stats: Optional[Dict[str, float]] = None
    distance_range: Optional[Dict[str, float]] = None
    lap_analysis: Optional[Dict[str, Any]] = None

class AnalysisResult(BaseModel):
    success: bool
    message: str
    files_analyzed: int
    results: List[FileAnalysis]
    comparison_summary: Optional[Dict[str, Any]] = None

class TelemetryDataPoint(BaseModel):
    time: float
    speed: Optional[float] = None
    distance: Optional[float] = None
    throttle_pos: Optional[float] = None
    brake_pos: Optional[float] = None
    gear: Optional[int] = None
    rpm: Optional[float] = None
    water_temp: Optional[float] = None
    oil_temp: Optional[float] = None
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None

class LapData(BaseModel):
    lap_number: int
    start_time: float
    end_time: float
    lap_time: float
    data_points: List[TelemetryDataPoint]
    is_fastest: bool = False

class SessionData(BaseModel):
    driver_name: Optional[str] = None
    session_name: Optional[str] = None
    track_name: Optional[str] = None
    laps: List[LapData] = []
    fastest_lap: Optional[LapData] = None
    metadata: Dict[str, Any] = {} 