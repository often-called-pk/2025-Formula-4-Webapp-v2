import pandas as pd
import numpy as np
from typing import List, Dict, Any
from models.telemetry_models import ProcessingResult, AnalysisResult, FileAnalysis, SessionData
from .data_cleaner import DataCleaner, LapDetector
from .data_alignment import DataAlignmentEngine, ComparisonCalculator

class TelemetryProcessor:
    """
    Service class for processing and analyzing telemetry data
    """
    
    def __init__(self):
        self.expected_columns = [
            'Time', 'Speed', 'Distance on Vehicle Speed', 'Throttle Pos',
            'Brake Pos', 'Gear', 'RPM', 'Water Temp', 'Oil Temp',
            'GPS Latitude', 'GPS Longitude'
        ]
        self.data_cleaner = DataCleaner()
        self.lap_detector = LapDetector()
        self.alignment_engine = DataAlignmentEngine()
        self.comparison_calculator = ComparisonCalculator()
    
    def process_single_file(self, df: pd.DataFrame, filename: str, session_id: str) -> ProcessingResult:
        """
        Process a single telemetry CSV file with enhanced cleaning and lap detection
        """
        try:
            print(f"Processing data for session_id: {session_id}")

            # Extract metadata from first few rows if available
            metadata, df_clean = self._extract_metadata(df)
            
            # Clean and normalize the data
            df_clean = self.data_cleaner.clean_data(df_clean)
            
            # Detect laps using metadata
            laps = self.lap_detector.detect_laps_from_metadata(metadata, df_clean)
            
            # Get fastest lap
            fastest_lap = self.lap_detector.get_fastest_lap(laps)
            fastest_lap_time = fastest_lap.lap_time if fastest_lap else None
            
            # Create session data
            session_data = SessionData(
                driver_name=metadata.get('Racer', 'Unknown'),
                session_name=metadata.get('Session', 'Unknown'),
                track_name=metadata.get('Session', 'Unknown'),  # Track info might be in session
                laps=laps,
                fastest_lap=fastest_lap,
                metadata=metadata
            )
            
            rows_processed = len(df_clean)
            
            return ProcessingResult(
                success=True,
                message=f"Successfully processed {filename} with {len(laps)} laps detected",
                filename=filename,
                rows_processed=rows_processed,
                fastest_lap_time=fastest_lap_time,
                metadata={
                    **metadata,
                    'laps_detected': len(laps),
                    'session_data': session_data.dict() if session_data else None
                }
            )
            
        except Exception as e:
            return ProcessingResult(
                success=False,
                message=f"Error processing {filename}: {str(e)}",
                filename=filename
            )
    
    def analyze_comparison(self, dataframes: List[pd.DataFrame], filenames: List[str]) -> AnalysisResult:
        """
        Analyze multiple telemetry files for comparison with enhanced processing
        """
        try:
            results = []
            processed_sessions = []
            
            for df, filename in zip(dataframes, filenames):
                # Process each file with enhanced analysis
                metadata, df_clean = self._extract_metadata(df)
                df_clean = self.data_cleaner.clean_data(df_clean)
                laps = self.lap_detector.detect_laps_from_metadata(metadata, df_clean)
                fastest_lap = self.lap_detector.get_fastest_lap(laps)
                
                # Create session data
                session_data = SessionData(
                    driver_name=metadata.get('Racer', 'Unknown'),
                    session_name=metadata.get('Session', 'Unknown'),
                    track_name=metadata.get('Session', 'Unknown'),
                    laps=laps,
                    fastest_lap=fastest_lap,
                    metadata=metadata
                )
                
                processed_sessions.append(session_data)
                
                # Create enhanced analysis
                analysis = self._analyze_single_dataframe_enhanced(df_clean, filename, session_data)
                results.append(analysis)
            
            # Create enhanced comparison summary
            comparison_summary = self._create_enhanced_comparison_summary(processed_sessions, filenames)
            
            return AnalysisResult(
                success=True,
                message="Enhanced analysis completed successfully",
                files_analyzed=len(dataframes),
                results=results,
                comparison_summary=comparison_summary
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                message=f"Analysis error: {str(e)}",
                files_analyzed=0,
                results=[]
            )
    
    def _extract_metadata(self, df: pd.DataFrame) -> tuple[Dict[str, Any], pd.DataFrame]:
        """
        Enhanced metadata extraction from AiM RaceStudio3 CSV files
        """
        metadata = {}
        header_end_row = 0
        
        # Special handling for fields with comma-separated values
        beacon_markers_row = None
        segment_times_row = None
        
        print(f"DEBUG: Starting metadata extraction from DataFrame with {len(df)} rows")
        
        # Look for the data header row (contains 'Time' column)
        for i, row in df.iterrows():
            if i > 20:  # Metadata should be in first ~20 rows
                break
                
            row_str = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ""
            print(f"DEBUG: Row {i}: Key='{row_str}'")
            
            # Check if this is the column header row - look for specific pattern
            # The Time column header row should have multiple telemetry column names
            if row_str == 'Time' and len(row) > 5:
                # Check if this row has typical telemetry column headers
                second_col = str(row.iloc[1]) if len(row) > 1 and pd.notna(row.iloc[1]) else ""
                third_col = str(row.iloc[2]) if len(row) > 2 and pd.notna(row.iloc[2]) else ""
                
                # Look for GPS or Speed in the column headers
                if any(keyword in second_col or keyword in third_col for keyword in ['GPS', 'Speed', 'Nsat']):
                    header_end_row = i
                    print(f"DEBUG: Found telemetry header row at {i}")
                    break
            
            # Extract metadata key-value pairs
            if pd.notna(row.iloc[0]):
                key = str(row.iloc[0]).strip().rstrip(':')
                
                # Special handling for beacon markers and segment times
                if key == 'Beacon Markers':
                    print(f"DEBUG: Processing Beacon Markers at row {i}")
                    beacon_markers_row = i
                    # Get the full row data for beacon markers
                    beacon_values = []
                    for col_idx in range(1, len(row)):
                        if pd.notna(row.iloc[col_idx]):
                            val_str = str(row.iloc[col_idx]).strip()
                            if val_str and val_str != 'nan':
                                beacon_values.append(val_str)
                    if beacon_values:  # Only add if we have values
                        metadata[key] = ','.join(beacon_values)
                        print(f"DEBUG: Added {len(beacon_values)} beacon markers to metadata")
                    else:
                        print(f"DEBUG: No beacon values found")
                elif key == 'Segment Times':
                    print(f"DEBUG: Processing Segment Times at row {i}")
                    segment_times_row = i
                    # Get the full row data for segment times
                    segment_values = []
                    for col_idx in range(1, len(row)):
                        if pd.notna(row.iloc[col_idx]):
                            val_str = str(row.iloc[col_idx]).strip()
                            if val_str and val_str != 'nan':
                                segment_values.append(val_str)
                    if segment_values:  # Only add if we have values
                        metadata[key] = ','.join(segment_values)
                        print(f"DEBUG: Added {len(segment_values)} segment times to metadata")
                    else:
                        print(f"DEBUG: No segment values found")
                elif len(row) > 1 and pd.notna(row.iloc[1]):
                    # Regular key-value pair
                    value = str(row.iloc[1]).strip()
                    # Skip empty values
                    if value and value != 'nan':
                        metadata[key] = value
                        print(f"DEBUG: Added regular metadata {key}={value}")
        
        print(f"DEBUG: Metadata extraction complete. Found {len(metadata)} items")
        
        # Process the DataFrame
        df_processed = df.copy()
        
        if header_end_row > 0:
            # Set column names from the header row
            new_columns = df.iloc[header_end_row].fillna('Unknown').astype(str)
            df_processed.columns = new_columns
            
            # Drop metadata rows and header row
            df_processed = df_processed.iloc[header_end_row + 1:].reset_index(drop=True)
            
            # Remove any empty rows
            df_processed = df_processed.dropna(how='all')

        return metadata, df_processed
    
    def _calculate_fastest_lap_time(self, df: pd.DataFrame) -> float:
        """
        Calculate fastest lap time from telemetry data
        """
        if 'Time' not in df.columns:
            return None
        
        # Simple calculation - could be enhanced with lap detection
        time_series = pd.to_numeric(df['Time'], errors='coerce')
        time_series = time_series.dropna()
        
        if len(time_series) > 0:
            return float(time_series.max() - time_series.min())
        
        return None
    
    def _analyze_single_dataframe_enhanced(self, df: pd.DataFrame, filename: str, 
                                         session_data: SessionData) -> FileAnalysis:
        """
        Enhanced analysis of a single dataframe with lap data
        """
        analysis = FileAnalysis(
            filename=filename,
            rows=len(df),
            columns=list(df.columns)
        )
        
        # Time range analysis
        if 'Time' in df.columns:
            time_series = pd.to_numeric(df['Time'], errors='coerce')
            time_series = time_series.dropna()
            if len(time_series) > 0:
                analysis.time_range = {
                    "min": float(time_series.min()),
                    "max": float(time_series.max()),
                    "duration": float(time_series.max() - time_series.min())
                }
        
        # Enhanced speed statistics with lap context
        speed_col = 'Speed' if 'Speed' in df.columns else None
        if speed_col:
            speed_series = pd.to_numeric(df[speed_col], errors='coerce')
            speed_series = speed_series.dropna()
            if len(speed_series) > 0:
                analysis.speed_stats = {
                    "min": float(speed_series.min()),
                    "max": float(speed_series.max()),
                    "mean": float(speed_series.mean()),
                    "std": float(speed_series.std()),
                    "fastest_lap_max_speed": float(speed_series.max()) if session_data.fastest_lap else None
                }
        
        # Enhanced distance range
        distance_col = 'Distance on Vehicle Speed' if 'Distance on Vehicle Speed' in df.columns else 'Distance'
        if distance_col in df.columns:
            distance_series = pd.to_numeric(df[distance_col], errors='coerce')
            distance_series = distance_series.dropna()
            if len(distance_series) > 0:
                analysis.distance_range = {
                    "min": float(distance_series.min()),
                    "max": float(distance_series.max()),
                    "total": float(distance_series.max() - distance_series.min())
                }
        
        # Add lap analysis
        if session_data.laps:
            analysis.lap_analysis = {
                "total_laps": len(session_data.laps),
                "fastest_lap_time": session_data.fastest_lap.lap_time if session_data.fastest_lap else None,
                "fastest_lap_number": session_data.fastest_lap.lap_number if session_data.fastest_lap else None,
                "average_lap_time": sum(lap.lap_time for lap in session_data.laps) / len(session_data.laps),
                "lap_time_std": np.std([lap.lap_time for lap in session_data.laps])
            }
        
        return analysis
    
    def _analyze_single_dataframe(self, df: pd.DataFrame, filename: str) -> FileAnalysis:
        """
        Legacy analysis method for backwards compatibility
        """
        return self._analyze_single_dataframe_enhanced(df, filename, SessionData())
    
    def _create_enhanced_comparison_summary(self, sessions: List[SessionData], 
                                          filenames: List[str]) -> Dict[str, Any]:
        """
        Create enhanced comparison summary with lap-based analysis
        """
        summary = {
            "file_count": len(sessions),
            "filenames": filenames,
            "drivers": [session.driver_name for session in sessions],
            "comparison_metrics": {},
            "lap_comparison": {}
        }
        
        # Compare basic metrics and lap performance
        for i, (session, filename) in enumerate(zip(sessions, filenames)):
            key = f"driver_{i+1}"
            summary["comparison_metrics"][key] = {
                "driver_name": session.driver_name,
                "filename": filename,
                "total_laps": len(session.laps),
                "fastest_lap_time": session.fastest_lap.lap_time if session.fastest_lap else None,
                "session_duration": session.metadata.get('Duration', 'Unknown')
            }
            
            # Add speed comparison from fastest lap if available
            if session.fastest_lap and session.fastest_lap.data_points:
                max_speed = max(point.speed for point in session.fastest_lap.data_points if point.speed)
                avg_speed = np.mean([point.speed for point in session.fastest_lap.data_points if point.speed])
                summary["comparison_metrics"][key]["fastest_lap_max_speed"] = max_speed
                summary["comparison_metrics"][key]["fastest_lap_avg_speed"] = avg_speed
        
        # Cross-driver comparison
        if len(sessions) == 2:
            session1, session2 = sessions
            if session1.fastest_lap and session2.fastest_lap:
                time_diff = session1.fastest_lap.lap_time - session2.fastest_lap.lap_time
                summary["lap_comparison"] = {
                    "fastest_lap_time_difference": time_diff,
                    "faster_driver": session1.driver_name if time_diff < 0 else session2.driver_name,
                    "time_gap": abs(time_diff)
                }
        
        return summary
    
    def _create_comparison_summary(self, dataframes: List[pd.DataFrame], filenames: List[str]) -> Dict[str, Any]:
        """
        Legacy comparison summary method for backwards compatibility
        """
        summary = {
            "file_count": len(dataframes),
            "filenames": filenames,
            "comparison_metrics": {}
        }
        
        # Compare basic metrics
        for i, (df, filename) in enumerate(zip(dataframes, filenames)):
            key = f"file_{i+1}"
            summary["comparison_metrics"][key] = {
                "filename": filename,
                "rows": len(df),
                "columns": len(df.columns)
            }
            
            # Add speed comparison if available
            if 'Speed' in df.columns:
                speed_series = pd.to_numeric(df['Speed'], errors='coerce').dropna()
                if len(speed_series) > 0:
                    summary["comparison_metrics"][key]["max_speed"] = float(speed_series.max())
                    summary["comparison_metrics"][key]["avg_speed"] = float(speed_series.mean())
        
        return summary
    
    def compare_sessions_detailed(self, session1: SessionData, session2: SessionData, 
                                 use_fastest_laps: bool = True, specific_lap1: int = None, 
                                 specific_lap2: int = None) -> Dict[str, Any]:
        """
        Perform detailed comparison between two sessions using data alignment
        
        Args:
            session1: First driver's session data
            session2: Second driver's session data
            use_fastest_laps: Whether to use fastest laps for comparison
            specific_lap1: Specific lap number from session1
            specific_lap2: Specific lap number from session2
            
        Returns:
            Detailed comparison results including aligned data and metrics
        """
        try:
            # Perform alignment and basic comparison
            alignment_result = self.alignment_engine.align_sessions(
                session1, session2, use_fastest_laps, specific_lap1, specific_lap2
            )
            
            if not alignment_result.get("success"):
                return alignment_result
            
            # Add advanced cornering analysis
            cornering_analysis = self.comparison_calculator.calculate_cornering_analysis(
                alignment_result["aligned_data"]
            )
            
            # Add oversteer/understeer analysis (placeholder for future enhancement)
            oversteer_analysis = self.comparison_calculator.calculate_oversteer_understeer(
                alignment_result["aligned_data"]
            )
            
            # Combine all results
            detailed_result = {
                **alignment_result,
                "cornering_analysis": cornering_analysis,
                "oversteer_understeer_analysis": oversteer_analysis,
                "analysis_type": "detailed_comparison"
            }
            
            return detailed_result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error in detailed session comparison: {str(e)}"
            }
    
    def get_lap_comparison_data(self, session1: SessionData, session2: SessionData, 
                               lap1_number: int = None, lap2_number: int = None) -> Dict[str, Any]:
        """
        Get aligned lap data for visualization and detailed analysis
        
        Args:
            session1: First driver's session data
            session2: Second driver's session data
            lap1_number: Specific lap number from session1 (uses fastest if None)
            lap2_number: Specific lap number from session2 (uses fastest if None)
            
        Returns:
            Aligned lap data suitable for frontend visualization
        """
        try:
            result = self.alignment_engine.align_sessions(
                session1, session2, 
                use_fastest_laps=(lap1_number is None and lap2_number is None),
                specific_lap1=lap1_number,
                specific_lap2=lap2_number
            )
            
            if not result.get("success"):
                return result
            
            # Format data for frontend consumption
            aligned_data = result["aligned_data"]
            
            # Create arrays for easy plotting
            visualization_data = {
                "success": True,
                "lap_info": {
                    "driver1": result["driver1"],
                    "driver2": result["driver2"]
                },
                "distance": aligned_data["distance"],
                "channels": {
                    "speed": {
                        "driver1": aligned_data["driver1"].get("speed", []),
                        "driver2": aligned_data["driver2"].get("speed", [])
                    },
                    "throttle": {
                        "driver1": aligned_data["driver1"].get("throttle", []),
                        "driver2": aligned_data["driver2"].get("throttle", [])
                    },
                    "brake": {
                        "driver1": aligned_data["driver1"].get("brake", []),
                        "driver2": aligned_data["driver2"].get("brake", [])
                    },
                    "gear": {
                        "driver1": aligned_data["driver1"].get("gear", []),
                        "driver2": aligned_data["driver2"].get("gear", [])
                    },
                    "rpm": {
                        "driver1": aligned_data["driver1"].get("rpm", []),
                        "driver2": aligned_data["driver2"].get("rpm", [])
                    }
                },
                "comparison_summary": result.get("comparison_metrics", {}),
                "sector_analysis": result.get("sector_analysis", {})
            }
            
            return visualization_data
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error getting lap comparison data: {str(e)}"
            } 