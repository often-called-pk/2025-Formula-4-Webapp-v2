import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from scipy.interpolate import interp1d
from scipy.spatial.distance import cdist
import math
from models.telemetry_models import SessionData, LapData, TelemetryDataPoint

class DataAlignmentEngine:
    """
    Engine for aligning telemetry data between drivers and calculating comparative metrics
    """
    
    def __init__(self):
        self.gps_earth_radius = 6371000  # Earth radius in meters for GPS calculations
        
    def align_sessions(self, session1: SessionData, session2: SessionData, 
                      use_fastest_laps: bool = True, specific_lap1: Optional[int] = None,
                      specific_lap2: Optional[int] = None) -> Dict[str, Any]:
        """
        Align two sessions for comparison, typically using fastest laps
        
        Args:
            session1: First driver's session data
            session2: Second driver's session data  
            use_fastest_laps: Whether to use fastest laps for comparison (default: True)
            specific_lap1: Specific lap number from session1 (overrides fastest lap)
            specific_lap2: Specific lap number from session2 (overrides fastest lap)
            
        Returns:
            Dictionary containing aligned data and comparison metrics
        """
        try:
            # Select laps for comparison
            if specific_lap1 is not None:
                lap1 = next((lap for lap in session1.laps if lap.lap_number == specific_lap1), None)
            else:
                lap1 = session1.fastest_lap if use_fastest_laps else session1.laps[0] if session1.laps else None
                
            if specific_lap2 is not None:
                lap2 = next((lap for lap in session2.laps if lap.lap_number == specific_lap2), None)
            else:
                lap2 = session2.fastest_lap if use_fastest_laps else session2.laps[0] if session2.laps else None
            
            if not lap1 or not lap2:
                return {
                    "success": False,
                    "error": "Required laps not found in session data",
                    "lap1_available": lap1 is not None,
                    "lap2_available": lap2 is not None
                }
            
            # Calculate distance-based alignment
            lap1_distance_aligned = self._calculate_distance_alignment(lap1)
            lap2_distance_aligned = self._calculate_distance_alignment(lap2)
            
            if not lap1_distance_aligned or not lap2_distance_aligned:
                return {
                    "success": False,
                    "error": "Failed to calculate distance alignment for laps"
                }
            
            # Align data points by distance
            aligned_data = self._align_by_distance(lap1_distance_aligned, lap2_distance_aligned)
            
            # Calculate comparative metrics
            comparison_metrics = self._calculate_comparison_metrics(aligned_data)
            
            # Calculate sector analysis
            sector_analysis = self._calculate_sector_analysis(aligned_data)
            
            return {
                "success": True,
                "driver1": {
                    "name": session1.driver_name or "Driver 1",
                    "lap_number": lap1.lap_number,
                    "lap_time": lap1.lap_time,
                    "is_fastest": lap1.is_fastest
                },
                "driver2": {
                    "name": session2.driver_name or "Driver 2", 
                    "lap_number": lap2.lap_number,
                    "lap_time": lap2.lap_time,
                    "is_fastest": lap2.is_fastest
                },
                "aligned_data": aligned_data,
                "comparison_metrics": comparison_metrics,
                "sector_analysis": sector_analysis,
                "alignment_info": {
                    "total_distance": aligned_data["distance"][-1] if aligned_data["distance"] else 0,
                    "data_points": len(aligned_data["distance"]) if aligned_data["distance"] else 0,
                    "interpolation_spacing": 10  # meters
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error aligning sessions: {str(e)}"
            }
    
    def _calculate_distance_alignment(self, lap: LapData) -> Optional[List[Dict[str, Any]]]:
        """
        Calculate cumulative distance along track using GPS coordinates and speed
        
        Args:
            lap: LapData containing telemetry points
            
        Returns:
            List of data points with calculated distance values
        """
        try:
            if not lap.data_points:
                return None
            
            aligned_points = []
            cumulative_distance = 0.0
            
            for i, point in enumerate(lap.data_points):
                if i == 0:
                    # First point starts at distance 0
                    aligned_points.append({
                        "distance": 0.0,
                        "time": point.time,
                        "speed": point.speed or 0,
                        "throttle": point.throttle_pos or 0,
                        "brake": point.brake_pos or 0,
                        "gear": point.gear or 1,
                        "rpm": point.rpm or 0,
                        "gps_lat": point.gps_latitude,
                        "gps_lon": point.gps_longitude,
                        "water_temp": point.water_temp,
                        "oil_temp": point.oil_temp
                    })
                    continue
                
                # Calculate distance from previous point
                prev_point = lap.data_points[i-1]
                
                # Try GPS-based distance calculation first
                if (point.gps_latitude and point.gps_longitude and 
                    prev_point.gps_latitude and prev_point.gps_longitude):
                    distance_increment = self._calculate_gps_distance(
                        prev_point.gps_latitude, prev_point.gps_longitude,
                        point.gps_latitude, point.gps_longitude
                    )
                else:
                    # Fallback to speed-based distance calculation
                    time_diff = point.time - prev_point.time
                    avg_speed = ((point.speed or 0) + (prev_point.speed or 0)) / 2
                    distance_increment = (avg_speed * 1000 / 3600) * time_diff  # Convert km/h to m/s
                
                cumulative_distance += distance_increment
                
                aligned_points.append({
                    "distance": cumulative_distance,
                    "time": point.time,
                    "speed": point.speed or 0,
                    "throttle": point.throttle_pos or 0,
                    "brake": point.brake_pos or 0,
                    "gear": point.gear or 1,
                    "rpm": point.rpm or 0,
                    "gps_lat": point.gps_latitude,
                    "gps_lon": point.gps_longitude,
                    "water_temp": point.water_temp,
                    "oil_temp": point.oil_temp
                })
            
            return aligned_points
            
        except Exception as e:
            print(f"Error calculating distance alignment: {e}")
            return None
    
    def _calculate_gps_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two GPS points using Haversine formula
        
        Returns:
            Distance in meters
        """
        # Convert degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1) 
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        a = (math.sin(dlat/2)**2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2)
        c = 2 * math.asin(math.sqrt(a))
        
        return self.gps_earth_radius * c
    
    def _align_by_distance(self, lap1_data: List[Dict], lap2_data: List[Dict]) -> Dict[str, List[float]]:
        """
        Align two laps by distance using interpolation for consistent spacing
        
        Args:
            lap1_data: Distance-aligned data for first lap
            lap2_data: Distance-aligned data for second lap
            
        Returns:
            Dictionary with aligned data arrays
        """
        try:
            # Determine common distance range
            max_distance1 = lap1_data[-1]["distance"] if lap1_data else 0
            max_distance2 = lap2_data[-1]["distance"] if lap2_data else 0
            min_distance = min(max_distance1, max_distance2)
            
            # Create common distance points (every 10 meters)
            distance_spacing = 10.0
            common_distances = np.arange(0, min_distance, distance_spacing)
            
            # Interpolate lap1 data
            lap1_interpolated = self._interpolate_lap_data(lap1_data, common_distances)
            lap2_interpolated = self._interpolate_lap_data(lap2_data, common_distances)
            
            return {
                "distance": common_distances.tolist(),
                "driver1": lap1_interpolated,
                "driver2": lap2_interpolated
            }
            
        except Exception as e:
            print(f"Error aligning by distance: {e}")
            return {"distance": [], "driver1": {}, "driver2": {}}
    
    def _interpolate_lap_data(self, lap_data: List[Dict], target_distances: np.ndarray) -> Dict[str, List[float]]:
        """
        Interpolate lap data to match target distance points
        
        Args:
            lap_data: Original lap data with distance values
            target_distances: Array of target distance points
            
        Returns:
            Dictionary with interpolated data arrays
        """
        try:
            # Extract distance and data arrays
            distances = np.array([point["distance"] for point in lap_data])
            
            interpolated = {}
            
            # Interpolate each data channel
            channels = ["time", "speed", "throttle", "brake", "gear", "rpm", "water_temp", "oil_temp"]
            
            for channel in channels:
                values = np.array([point.get(channel, 0) for point in lap_data])
                
                # Handle special cases for gear (should be integer-like)
                if channel == "gear":
                    values = np.array([max(1, int(point.get(channel, 1))) for point in lap_data])
                
                # Only interpolate if we have valid data
                if len(distances) > 1 and len(values) > 1:
                    # Remove any NaN or invalid values
                    valid_indices = ~np.isnan(values) & ~np.isnan(distances)
                    if np.sum(valid_indices) > 1:
                        interp_func = interp1d(
                            distances[valid_indices], 
                            values[valid_indices],
                            kind='linear',
                            fill_value='extrapolate',
                            bounds_error=False
                        )
                        interpolated[channel] = interp_func(target_distances).tolist()
                    else:
                        interpolated[channel] = [0] * len(target_distances)
                else:
                    interpolated[channel] = [0] * len(target_distances)
            
            return interpolated
            
        except Exception as e:
            print(f"Error interpolating lap data: {e}")
            return {}
    
    def _calculate_comparison_metrics(self, aligned_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate comparative metrics between two aligned datasets
        
        Args:
            aligned_data: Aligned data from both drivers
            
        Returns:
            Dictionary containing comparison metrics
        """
        try:
            driver1 = aligned_data["driver1"]
            driver2 = aligned_data["driver2"]
            distances = aligned_data["distance"]
            
            if not driver1 or not driver2 or not distances:
                return {}
            
            metrics = {}
            
            # Speed comparison
            if "speed" in driver1 and "speed" in driver2:
                speed_diff = np.array(driver1["speed"]) - np.array(driver2["speed"])
                metrics["speed_comparison"] = {
                    "max_speed_advantage_driver1": float(np.max(speed_diff)),
                    "max_speed_advantage_driver2": float(np.min(speed_diff)),
                    "avg_speed_difference": float(np.mean(speed_diff)),
                    "speed_advantage_distance": self._find_advantage_zones(speed_diff, distances)
                }
            
            # Enhanced time delta calculation
            if "speed" in driver1 and "speed" in driver2 and "time" in driver1 and "time" in driver2:
                metrics["time_comparison"] = self._calculate_lap_delta_detailed(
                    driver1, driver2, distances
                )
            
            # Throttle and brake comparison
            if "throttle" in driver1 and "throttle" in driver2:
                throttle_diff = np.array(driver1["throttle"]) - np.array(driver2["throttle"])
                metrics["throttle_comparison"] = {
                    "avg_throttle_difference": float(np.mean(throttle_diff)),
                    "more_aggressive_driver": 1 if np.mean(driver1["throttle"]) > np.mean(driver2["throttle"]) else 2
                }
            
            if "brake" in driver1 and "brake" in driver2:
                brake_diff = np.array(driver1["brake"]) - np.array(driver2["brake"])
                metrics["brake_comparison"] = {
                    "avg_brake_difference": float(np.mean(brake_diff)),
                    "later_braker": 1 if np.mean(driver1["brake"]) < np.mean(driver2["brake"]) else 2
                }
            
            # Overall performance summary
            metrics["performance_summary"] = self._calculate_performance_summary(driver1, driver2)
            
            return metrics
            
        except Exception as e:
            print(f"Error calculating comparison metrics: {e}")
            return {}
    
    def _find_advantage_zones(self, diff_array: np.ndarray, distances: List[float]) -> Dict[str, Any]:
        """
        Find zones where each driver has advantage
        
        Args:
            diff_array: Difference array (positive = driver1 advantage)
            distances: Distance array
            
        Returns:
            Dictionary with advantage zone information
        """
        try:
            driver1_advantage = diff_array > 0
            driver2_advantage = diff_array < 0
            
            return {
                "driver1_advantage_percentage": float(np.sum(driver1_advantage) / len(diff_array) * 100),
                "driver2_advantage_percentage": float(np.sum(driver2_advantage) / len(diff_array) * 100),
                "biggest_driver1_advantage": float(np.max(diff_array)),
                "biggest_driver2_advantage": float(np.abs(np.min(diff_array)))
            }
        except:
            return {}
    
    def _calculate_sector_analysis(self, aligned_data: Dict[str, Any], num_sectors: int = 3) -> Dict[str, Any]:
        """
        Calculate sector-based performance analysis
        
        Args:
            aligned_data: Aligned data from both drivers
            num_sectors: Number of sectors to divide track into
            
        Returns:
            Dictionary with sector analysis
        """
        try:
            distances = aligned_data["distance"]
            if not distances:
                return {}
            
            total_distance = distances[-1]
            sector_length = total_distance / num_sectors
            
            sector_analysis = {}
            
            for sector in range(num_sectors):
                sector_start = sector * sector_length
                sector_end = (sector + 1) * sector_length
                
                # Find indices for this sector
                sector_indices = [
                    i for i, d in enumerate(distances) 
                    if sector_start <= d < sector_end
                ]
                
                if not sector_indices:
                    continue
                
                driver1 = aligned_data["driver1"]
                driver2 = aligned_data["driver2"]
                
                # Calculate sector averages
                sector_data = {}
                
                if "speed" in driver1 and "speed" in driver2:
                    driver1_sector_speed = np.mean([driver1["speed"][i] for i in sector_indices])
                    driver2_sector_speed = np.mean([driver2["speed"][i] for i in sector_indices])
                    
                    sector_data["avg_speed"] = {
                        "driver1": float(driver1_sector_speed),
                        "driver2": float(driver2_sector_speed),
                        "advantage": "driver1" if driver1_sector_speed > driver2_sector_speed else "driver2",
                        "difference": float(abs(driver1_sector_speed - driver2_sector_speed))
                    }
                
                if "time" in driver1 and "time" in driver2:
                    # Calculate time spent in sector
                    driver1_sector_time = driver1["time"][sector_indices[-1]] - driver1["time"][sector_indices[0]]
                    driver2_sector_time = driver2["time"][sector_indices[-1]] - driver2["time"][sector_indices[0]]
                    
                    sector_data["sector_time"] = {
                        "driver1": float(driver1_sector_time),
                        "driver2": float(driver2_sector_time),
                        "advantage": "driver1" if driver1_sector_time < driver2_sector_time else "driver2",
                        "difference": float(abs(driver1_sector_time - driver2_sector_time))
                    }
                
                sector_analysis[f"sector_{sector + 1}"] = sector_data
            
            return sector_analysis
            
        except Exception as e:
            print(f"Error calculating sector analysis: {e}")
            return {}
    
    def _calculate_performance_summary(self, driver1: Dict, driver2: Dict) -> Dict[str, Any]:
        """
        Calculate overall performance summary comparing two drivers
        
        Args:
            driver1: Driver 1 data
            driver2: Driver 2 data
            
        Returns:
            Performance summary dictionary
        """
        try:
            summary = {}
            
            # Speed metrics
            if "speed" in driver1 and "speed" in driver2:
                driver1_max_speed = max(driver1["speed"])
                driver2_max_speed = max(driver2["speed"])
                driver1_avg_speed = np.mean(driver1["speed"])
                driver2_avg_speed = np.mean(driver2["speed"])
                
                summary["speed_analysis"] = {
                    "faster_max_speed": "driver1" if driver1_max_speed > driver2_max_speed else "driver2",
                    "faster_avg_speed": "driver1" if driver1_avg_speed > driver2_avg_speed else "driver2",
                    "max_speed_gap": float(abs(driver1_max_speed - driver2_max_speed)),
                    "avg_speed_gap": float(abs(driver1_avg_speed - driver2_avg_speed))
                }
            
            # Driving style analysis
            if "throttle" in driver1 and "throttle" in driver2:
                driver1_aggression = np.mean([max(0, x) for x in driver1["throttle"]])
                driver2_aggression = np.mean([max(0, x) for x in driver2["throttle"]])
                
                summary["driving_style"] = {
                    "more_aggressive_throttle": "driver1" if driver1_aggression > driver2_aggression else "driver2",
                    "throttle_aggression_gap": float(abs(driver1_aggression - driver2_aggression))
                }
            
            return summary
            
        except Exception as e:
            print(f"Error calculating performance summary: {e}")
            return {}
    
    def _calculate_lap_delta_detailed(self, driver1: Dict, driver2: Dict, distances: List[float]) -> Dict[str, Any]:
        """
        Calculate detailed lap delta (time differences) between two drivers
        
        Args:
            driver1: Driver 1 telemetry data
            driver2: Driver 2 telemetry data  
            distances: Distance array for alignment
            
        Returns:
            Detailed lap delta analysis including progressive time differences
        """
        try:
            time1 = np.array(driver1["time"])
            time2 = np.array(driver2["time"])
            
            # Calculate raw time delta (driver1 - driver2, negative means driver1 is behind)
            time_delta = time1 - time2
            
            # Calculate cumulative delta (progressive time difference)
            # This shows how the gap builds up over the lap
            cumulative_delta = time_delta - time_delta[0]  # Normalize to start at 0
            
            # Find zero crossings (where drivers are equal)
            zero_crossings = []
            for i in range(1, len(cumulative_delta)):
                if (cumulative_delta[i-1] > 0 and cumulative_delta[i] <= 0) or \
                   (cumulative_delta[i-1] < 0 and cumulative_delta[i] >= 0):
                    # Linear interpolation to find exact crossing point
                    crossing_distance = distances[i-1] + \
                        (distances[i] - distances[i-1]) * \
                        abs(cumulative_delta[i-1]) / (abs(cumulative_delta[i-1]) + abs(cumulative_delta[i]))
                    zero_crossings.append({
                        "distance": float(crossing_distance),
                        "index": i-1
                    })
            
            # Find maximum gaps
            max_driver1_advantage_idx = np.argmax(cumulative_delta)
            max_driver2_advantage_idx = np.argmin(cumulative_delta)
            
            # Calculate sector deltas (3 sectors)
            sector_deltas = []
            num_sectors = 3
            total_distance = distances[-1] if distances else 0
            sector_length = total_distance / num_sectors
            
            for sector in range(num_sectors):
                sector_start = sector * sector_length
                sector_end = (sector + 1) * sector_length
                
                # Find indices for this sector
                sector_indices = [
                    i for i, d in enumerate(distances) 
                    if sector_start <= d <= sector_end
                ]
                
                if sector_indices:
                    sector_start_delta = cumulative_delta[sector_indices[0]]
                    sector_end_delta = cumulative_delta[sector_indices[-1]]
                    sector_time_gained = sector_end_delta - sector_start_delta
                    
                    sector_deltas.append({
                        "sector": sector + 1,
                        "start_distance": float(sector_start),
                        "end_distance": float(sector_end),
                        "time_gained_driver1": float(sector_time_gained),
                        "time_gained_driver2": float(-sector_time_gained),
                        "advantage": "driver1" if sector_time_gained > 0 else "driver2"
                    })
            
            return {
                "time_delta_array": time_delta.tolist(),
                "cumulative_delta_array": cumulative_delta.tolist(),
                "distance_array": distances,
                "time_delta_start": float(time_delta[0]) if len(time_delta) > 0 else 0,
                "time_delta_end": float(time_delta[-1]) if len(time_delta) > 0 else 0,
                "cumulative_delta_final": float(cumulative_delta[-1]) if len(cumulative_delta) > 0 else 0,
                "max_time_gap": float(np.max(np.abs(cumulative_delta))),
                "avg_time_delta": float(np.mean(time_delta)),
                "zero_crossings": zero_crossings,
                "max_advantages": {
                    "driver1_max_advantage": {
                        "time_gap": float(cumulative_delta[max_driver1_advantage_idx]),
                        "distance": float(distances[max_driver1_advantage_idx]),
                        "index": int(max_driver1_advantage_idx)
                    },
                    "driver2_max_advantage": {
                        "time_gap": float(abs(cumulative_delta[max_driver2_advantage_idx])),
                        "distance": float(distances[max_driver2_advantage_idx]),
                        "index": int(max_driver2_advantage_idx)
                    }
                },
                "sector_analysis": sector_deltas,
                "statistics": {
                    "driver1_ahead_percentage": float(np.sum(cumulative_delta > 0) / len(cumulative_delta) * 100),
                    "driver2_ahead_percentage": float(np.sum(cumulative_delta < 0) / len(cumulative_delta) * 100),
                    "even_percentage": float(np.sum(np.abs(cumulative_delta) < 0.1) / len(cumulative_delta) * 100),
                    "delta_variance": float(np.var(cumulative_delta)),
                    "delta_std": float(np.std(cumulative_delta))
                }
            }
            
        except Exception as e:
            print(f"Error calculating detailed lap delta: {e}")
            return {
                "error": f"Lap delta calculation failed: {str(e)}",
                "time_delta_array": [],
                "cumulative_delta_array": [],
                "distance_array": []
            }


class ComparisonCalculator:
    """
    Advanced calculator for driving technique analysis and comparative metrics
    """
    
    def __init__(self):
        self.alignment_engine = DataAlignmentEngine()
    
    def calculate_oversteer_understeer(self, aligned_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate oversteer/understeer metrics using steering angle and lateral acceleration
        Currently placeholder - would need steering angle data from telemetry
        
        Args:
            aligned_data: Aligned telemetry data
            
        Returns:
            Dictionary with oversteer/understeer analysis
        """
        # Note: This would require steering angle and lateral acceleration data
        # which may not be available in basic AiM CSV exports
        return {
            "note": "Oversteer/understeer analysis requires steering angle and lateral acceleration data",
            "available_channels": list(aligned_data.get("driver1", {}).keys())
        }
    
    def calculate_cornering_analysis(self, aligned_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze cornering technique based on speed, throttle, and brake patterns
        
        Args:
            aligned_data: Aligned telemetry data
            
        Returns:
            Dictionary with cornering analysis
        """
        try:
            driver1 = aligned_data.get("driver1", {})
            driver2 = aligned_data.get("driver2", {})
            
            if not driver1 or not driver2:
                return {}
            
            analysis = {}
            
            # Identify cornering zones (where speed drops significantly)
            if "speed" in driver1 and "speed" in driver2:
                cornering_zones = self._identify_cornering_zones(driver1["speed"], driver2["speed"])
                analysis["cornering_zones"] = cornering_zones
                
                # Analyze braking points
                if "brake" in driver1 and "brake" in driver2:
                    braking_analysis = self._analyze_braking_points(
                        driver1["brake"], driver2["brake"], 
                        driver1["speed"], driver2["speed"]
                    )
                    analysis["braking_analysis"] = braking_analysis
                
                # Analyze acceleration out of corners
                if "throttle" in driver1 and "throttle" in driver2:
                    accel_analysis = self._analyze_corner_exit(
                        driver1["throttle"], driver2["throttle"],
                        driver1["speed"], driver2["speed"]
                    )
                    analysis["acceleration_analysis"] = accel_analysis
            
            return analysis
            
        except Exception as e:
            print(f"Error calculating cornering analysis: {e}")
            return {}
    
    def _identify_cornering_zones(self, speed1: List[float], speed2: List[float]) -> Dict[str, Any]:
        """
        Identify cornering zones based on speed reduction patterns
        """
        try:
            # Simple corner detection: significant speed reduction
            avg_speed1 = np.mean(speed1)
            avg_speed2 = np.mean(speed2)
            
            # Find zones where speed drops below 80% of average
            threshold1 = avg_speed1 * 0.8
            threshold2 = avg_speed2 * 0.8
            
            corners1 = np.array(speed1) < threshold1
            corners2 = np.array(speed2) < threshold2
            
            return {
                "driver1_corner_percentage": float(np.sum(corners1) / len(speed1) * 100),
                "driver2_corner_percentage": float(np.sum(corners2) / len(speed2) * 100),
                "avg_corner_speed_driver1": float(np.mean([s for s in speed1 if s < threshold1]) if np.any(corners1) else 0),
                "avg_corner_speed_driver2": float(np.mean([s for s in speed2 if s < threshold2]) if np.any(corners2) else 0)
            }
        except:
            return {}
    
    def _analyze_braking_points(self, brake1: List[float], brake2: List[float], 
                               speed1: List[float], speed2: List[float]) -> Dict[str, Any]:
        """
        Analyze braking technique and points
        """
        try:
            # Find heavy braking zones (brake > 50%)
            heavy_brake1 = np.array(brake1) > 50
            heavy_brake2 = np.array(brake2) > 50
            
            # Calculate average speed during heavy braking
            brake_speeds1 = [speed1[i] for i, brake in enumerate(heavy_brake1) if brake and i < len(speed1)]
            brake_speeds2 = [speed2[i] for i, brake in enumerate(heavy_brake2) if brake and i < len(speed2)]
            
            return {
                "heavy_braking_percentage_driver1": float(np.sum(heavy_brake1) / len(brake1) * 100),
                "heavy_braking_percentage_driver2": float(np.sum(heavy_brake2) / len(brake2) * 100),
                "avg_braking_speed_driver1": float(np.mean(brake_speeds1)) if brake_speeds1 else 0,
                "avg_braking_speed_driver2": float(np.mean(brake_speeds2)) if brake_speeds2 else 0,
                "later_braker": "driver1" if np.mean(brake_speeds1 or [0]) > np.mean(brake_speeds2 or [0]) else "driver2"
            }
        except:
            return {}
    
    def _analyze_corner_exit(self, throttle1: List[float], throttle2: List[float],
                            speed1: List[float], speed2: List[float]) -> Dict[str, Any]:
        """
        Analyze acceleration out of corners
        """
        try:
            # Find low speed zones (corners) and analyze throttle application
            avg_speed = (np.mean(speed1) + np.mean(speed2)) / 2
            low_speed_threshold = avg_speed * 0.7
            
            # Find exit zones: where speed is increasing from low values
            exit_zones1 = []
            exit_zones2 = []
            
            for i in range(1, len(speed1)):
                if speed1[i-1] < low_speed_threshold and speed1[i] > speed1[i-1]:
                    exit_zones1.append(i)
                    
            for i in range(1, len(speed2)):
                if speed2[i-1] < low_speed_threshold and speed2[i] > speed2[i-1]:
                    exit_zones2.append(i)
            
            # Analyze throttle during these exit zones
            exit_throttle1 = [throttle1[i] for i in exit_zones1 if i < len(throttle1)]
            exit_throttle2 = [throttle2[i] for i in exit_zones2 if i < len(throttle2)]
            
            return {
                "avg_exit_throttle_driver1": float(np.mean(exit_throttle1)) if exit_throttle1 else 0,
                "avg_exit_throttle_driver2": float(np.mean(exit_throttle2)) if exit_throttle2 else 0,
                "more_aggressive_exit": "driver1" if np.mean(exit_throttle1 or [0]) > np.mean(exit_throttle2 or [0]) else "driver2",
                "exit_zones_detected": {
                    "driver1": len(exit_zones1),
                    "driver2": len(exit_zones2)
                }
            }
        except:
            return {} 