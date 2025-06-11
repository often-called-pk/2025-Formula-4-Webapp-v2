import pandas as pd
import numpy as np
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from models.telemetry_models import LapData, TelemetryDataPoint, SessionData

class DataCleaner:
    """
    Data cleaning and normalization service for telemetry data
    """
    
    def __init__(self):
        self.required_columns = ['Time', 'Speed', 'Distance on Vehicle Speed']
        self.optional_columns = [
            'Throttle Pos', 'Brake Pos', 'Gear', 'Engine RPM', 'RPM',
            'Water Temp', 'Oil Temp', 'GPS Latitude', 'GPS Longitude',
            'Lateral Acc', 'Inline Acc'
        ]
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and normalize telemetry data
        """
        df_clean = df.copy()
        
        # Convert time column to numeric, handling any format issues
        if 'Time' in df_clean.columns:
            df_clean['Time'] = pd.to_numeric(df_clean['Time'], errors='coerce')
        
        # Clean numeric columns
        numeric_columns = self._get_numeric_columns(df_clean)
        for col in numeric_columns:
            if col in df_clean.columns:
                df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
        
        # Handle missing values
        df_clean = self._interpolate_missing_values(df_clean)
        
        # Remove outliers
        df_clean = self._remove_outliers(df_clean)
        
        # Normalize units if needed
        df_clean = self._normalize_units(df_clean)
        
        return df_clean
    
    def _get_numeric_columns(self, df: pd.DataFrame) -> List[str]:
        """
        Get list of columns that should be numeric
        """
        return [col for col in df.columns if col in self.required_columns + self.optional_columns]
    
    def _interpolate_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Interpolate missing values in telemetry data
        """
        df_interpolated = df.copy()
        
        # Time-based interpolation for critical columns
        critical_columns = ['Speed', 'Distance on Vehicle Speed', 'GPS Latitude', 'GPS Longitude']
        
        for col in critical_columns:
            if col in df_interpolated.columns:
                # Linear interpolation for short gaps
                df_interpolated[col] = df_interpolated[col].interpolate(method='linear', limit=10)
                
                # Forward fill for remaining gaps (up to 5 samples)
                df_interpolated[col] = df_interpolated[col].fillna(method='ffill', limit=5)
        
        return df_interpolated
    
    def _remove_outliers(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Remove statistical outliers from telemetry data
        """
        df_clean = df.copy()
        
        # Define reasonable ranges for key parameters
        outlier_ranges = {
            'Speed': (0, 300),  # km/h
            'Engine RPM': (0, 12000),  # RPM
            'RPM': (0, 12000),  # Alternative RPM column name
            'Water Temp': (0, 150),  # Celsius
            'Oil Temp': (0, 150),  # Celsius
            'Throttle Pos': (-5, 105),  # Percentage
            'Brake Pos': (-5, 105),  # Percentage
        }
        
        for col, (min_val, max_val) in outlier_ranges.items():
            if col in df_clean.columns:
                # Remove values outside reasonable ranges
                df_clean.loc[(df_clean[col] < min_val) | (df_clean[col] > max_val), col] = np.nan
        
        return df_clean
    
    def _normalize_units(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize units across different data sources
        """
        df_normalized = df.copy()
        
        # Ensure percentage values are in 0-100 range
        percentage_columns = ['Throttle Pos', 'Brake Pos']
        for col in percentage_columns:
            if col in df_normalized.columns:
                # If values are in 0-1 range, convert to percentage
                if df_normalized[col].max() <= 1.0:
                    df_normalized[col] = df_normalized[col] * 100
        
        return df_normalized


class LapDetector:
    """
    Lap detection service using beacon markers and GPS data
    """
    
    def __init__(self):
        self.min_lap_time = 60  # Minimum valid lap time in seconds
        self.max_lap_time = 300  # Maximum valid lap time in seconds
    
    def detect_laps_from_metadata(self, metadata: Dict[str, Any], df: pd.DataFrame) -> List[LapData]:
        """
        Detect laps using beacon markers from metadata
        """
        beacon_markers = self._parse_beacon_markers(metadata)
        segment_times = self._parse_segment_times(metadata)
        
        if not beacon_markers:
            # Fallback to GPS-based detection
            return self._detect_laps_gps(df)
        
        return self._create_laps_from_beacons(beacon_markers, segment_times, df)
    
    def _parse_beacon_markers(self, metadata: Dict[str, Any]) -> List[float]:
        """
        Parse beacon markers from metadata
        """
        beacon_str = metadata.get('Beacon Markers', '')
        if not beacon_str:
            return []
        
        try:
            # Split by comma and convert to float
            markers = [float(x.strip()) for x in beacon_str.split(',') if x.strip()]
            return markers
        except (ValueError, AttributeError):
            return []
    
    def _parse_segment_times(self, metadata: Dict[str, Any]) -> List[float]:
        """
        Parse segment times from metadata and convert to seconds
        """
        segment_str = metadata.get('Segment Times', '')
        if not segment_str:
            return []
        
        try:
            segments = []
            # Parse time format MM:SS.S
            time_pattern = r'(\d{1,2}):(\d{2})\.(\d)'
            
            for segment in segment_str.split(','):
                segment = segment.strip()
                match = re.match(time_pattern, segment)
                if match:
                    minutes = int(match.group(1))
                    seconds = int(match.group(2))
                    tenths = int(match.group(3))
                    total_seconds = minutes * 60 + seconds + tenths / 10.0
                    segments.append(total_seconds)
            
            return segments
        except (ValueError, AttributeError):
            return []
    
    def _create_laps_from_beacons(self, beacon_markers: List[float], 
                                 segment_times: List[float], 
                                 df: pd.DataFrame) -> List[LapData]:
        """
        Create lap data using beacon markers
        """
        laps = []
        
        for i in range(len(beacon_markers) - 1):
            start_time = beacon_markers[i]
            end_time = beacon_markers[i + 1]
            
            # Get lap time from segment times if available
            if i < len(segment_times):
                lap_time = segment_times[i]
            else:
                lap_time = end_time - start_time
            
            # Validate lap time
            if not (self.min_lap_time <= lap_time <= self.max_lap_time):
                continue
            
            # Extract data points for this lap
            lap_mask = (df['Time'] >= start_time) & (df['Time'] <= end_time)
            lap_df = df[lap_mask].copy()
            
            if len(lap_df) == 0:
                continue
            
            # Convert to TelemetryDataPoint objects
            data_points = self._create_data_points(lap_df)
            
            lap = LapData(
                lap_number=i + 1,
                start_time=start_time,
                end_time=end_time,
                lap_time=lap_time,
                data_points=data_points
            )
            
            laps.append(lap)
        
        # Mark fastest lap
        if laps:
            fastest_lap = min(laps, key=lambda x: x.lap_time)
            fastest_lap.is_fastest = True
        
        return laps
    
    def _detect_laps_gps(self, df: pd.DataFrame) -> List[LapData]:
        """
        Fallback lap detection using GPS coordinates
        """
        # This is a simplified GPS-based lap detection
        # In reality, you'd need to define a start/finish line coordinate
        
        if 'GPS Latitude' not in df.columns or 'GPS Longitude' not in df.columns:
            return []
        
        # For now, return a single lap with all data
        # This would need proper implementation based on track layout
        data_points = self._create_data_points(df)
        
        if not data_points:
            return []
        
        total_time = data_points[-1].time - data_points[0].time
        
        lap = LapData(
            lap_number=1,
            start_time=data_points[0].time,
            end_time=data_points[-1].time,
            lap_time=total_time,
            data_points=data_points,
            is_fastest=True
        )
        
        return [lap]
    
    def _create_data_points(self, df: pd.DataFrame) -> List[TelemetryDataPoint]:
        """
        Convert DataFrame rows to TelemetryDataPoint objects
        """
        data_points = []
        
        for _, row in df.iterrows():
            point = TelemetryDataPoint(
                time=self._safe_float(row.get('Time')),
                speed=self._safe_float(row.get('Speed')),
                distance=self._safe_float(row.get('Distance on Vehicle Speed')),
                throttle_pos=self._safe_float(row.get('Throttle Pos')),
                brake_pos=self._safe_float(row.get('Brake Pos')),
                gear=self._safe_int(row.get('Gear')),
                rpm=self._safe_float(row.get('Engine RPM') or row.get('RPM')),
                water_temp=self._safe_float(row.get('Water Temp')),
                oil_temp=self._safe_float(row.get('Oil Temp')),
                gps_latitude=self._safe_float(row.get('GPS Latitude')),
                gps_longitude=self._safe_float(row.get('GPS Longitude'))
            )
            data_points.append(point)
        
        return data_points
    
    def _safe_float(self, value) -> Optional[float]:
        """
        Safely convert value to float
        """
        try:
            if pd.isna(value):
                return None
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_int(self, value) -> Optional[int]:
        """
        Safely convert value to int
        """
        try:
            if pd.isna(value):
                return None
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    def get_fastest_lap(self, laps: List[LapData]) -> Optional[LapData]:
        """
        Get the fastest lap from a list of laps
        """
        if not laps:
            return None
        
        valid_laps = [lap for lap in laps if self.min_lap_time <= lap.lap_time <= self.max_lap_time]
        
        if not valid_laps:
            return None
        
        return min(valid_laps, key=lambda x: x.lap_time)
