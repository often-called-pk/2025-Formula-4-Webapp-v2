import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime

from models.telemetry_models import SessionData, LapData, TelemetryDataPoint
from services.data_alignment import DataAlignmentEngine

logger = logging.getLogger(__name__)

class DriverAction(Enum):
    """Driver action classification"""
    FULL_THROTTLE = "full_throttle"
    PARTIAL_THROTTLE = "partial_throttle"
    COASTING = "coasting"
    BRAKING = "braking"
    TRAIL_BRAKING = "trail_braking"

class VehicleDynamics(Enum):
    """Vehicle dynamics classification"""
    NEUTRAL = "neutral"
    OVERSTEER = "oversteer"
    UNDERSTEER = "understeer"
    CORRECTION = "correction"

@dataclass
class ComparisonPoint:
    """Single point in comparison analysis"""
    distance: float
    time_delta: float  # driver1 - driver2 (negative means driver1 is behind)
    speed_delta: float
    throttle_delta: float
    brake_delta: float
    gear_delta: int
    rpm_delta: float
    
    # Driver 1 data
    driver1_speed: float
    driver1_throttle: float
    driver1_brake: float
    driver1_action: DriverAction
    driver1_dynamics: VehicleDynamics
    
    # Driver 2 data
    driver2_speed: float
    driver2_throttle: float
    driver2_brake: float
    driver2_action: DriverAction
    driver2_dynamics: VehicleDynamics

@dataclass
class SectorAnalysis:
    """Analysis results for a track sector"""
    sector_number: int
    start_distance: float
    end_distance: float
    
    # Timing analysis
    driver1_sector_time: float
    driver2_sector_time: float
    time_difference: float  # driver1 - driver2
    dominant_driver: str
    
    # Speed analysis
    max_speed_delta: float
    avg_speed_delta: float
    speed_advantage_distance: float  # distance where driver has speed advantage
    
    # Performance metrics
    braking_points: Dict[str, List[float]]  # driver -> list of braking points
    throttle_application_points: Dict[str, List[float]]
    corner_speeds: Dict[str, Dict[str, float]]  # driver -> {min_speed, max_speed}
    
    # Action analysis
    action_distribution: Dict[str, Dict[DriverAction, float]]  # driver -> action -> percentage

@dataclass
class ComparisonResult:
    """Complete comparison analysis result"""
    driver1_name: str
    driver2_name: str
    lap1_number: Optional[int]
    lap2_number: Optional[int]
    
    # Overall metrics
    total_time_delta: float
    faster_driver: str
    total_distance: float
    data_points: int
    
    # Detailed analysis
    comparison_points: List[ComparisonPoint]
    sector_analysis: List[SectorAnalysis]
    
    # Performance summaries
    speed_analysis: Dict[str, Any]
    action_analysis: Dict[str, Any]
    dynamics_analysis: Dict[str, Any]
    
    # Metadata
    analysis_timestamp: datetime
    processing_time: float

class DriverActionClassifier:
    """Classify driver actions based on telemetry data"""
    
    def __init__(self):
        # Configurable thresholds
        self.full_throttle_threshold = 95.0  # %
        self.partial_throttle_threshold = 10.0  # %
        self.braking_threshold = 5.0  # %
        self.trail_braking_threshold = 15.0  # % throttle while braking
        self.coasting_threshold = 5.0  # % for both throttle and brake
    
    def classify_action(self, throttle: float, brake: float) -> DriverAction:
        """Classify driver action at a single point"""
        # Full throttle detection
        if throttle >= self.full_throttle_threshold:
            return DriverAction.FULL_THROTTLE
        
        # Braking detection
        if brake >= self.braking_threshold:
            # Check for trail braking
            if throttle >= self.trail_braking_threshold:
                return DriverAction.TRAIL_BRAKING
            return DriverAction.BRAKING
        
        # Coasting detection
        if throttle <= self.coasting_threshold and brake <= self.coasting_threshold:
            return DriverAction.COASTING
        
        # Default to partial throttle
        return DriverAction.PARTIAL_THROTTLE
    
    def analyze_action_sequence(self, throttle_data: List[float], 
                              brake_data: List[float]) -> Dict[str, Any]:
        """Analyze sequence of driver actions"""
        actions = [self.classify_action(t, b) for t, b in zip(throttle_data, brake_data)]
        
        # Calculate action distribution
        action_counts = {action: actions.count(action) for action in DriverAction}
        total_points = len(actions)
        action_percentages = {
            action: (count / total_points) * 100 
            for action, count in action_counts.items()
        }
        
        # Find action transitions
        transitions = []
        for i in range(1, len(actions)):
            if actions[i] != actions[i-1]:
                transitions.append({
                    'point': i,
                    'from': actions[i-1],
                    'to': actions[i]
                })
        
        return {
            'action_distribution': action_percentages,
            'transitions': transitions,
            'dominant_action': max(action_percentages.items(), key=lambda x: x[1])[0],
            'total_transitions': len(transitions)
        }

class VehicleDynamicsAnalyzer:
    """Analyze vehicle dynamics and handling characteristics"""
    
    def __init__(self):
        # Thresholds for dynamics classification
        self.neutral_threshold = 0.1  # g-force
        self.severe_threshold = 0.3  # g-force
        self.correction_threshold = 10.0  # degrees/second steering rate
    
    def classify_dynamics(self, lateral_accel: float, steering_angle: float, 
                         speed: float, steering_rate: Optional[float] = None) -> VehicleDynamics:
        """Classify vehicle dynamics at a single point"""
        # Quick correction detection
        if steering_rate and abs(steering_rate) > self.correction_threshold:
            return VehicleDynamics.CORRECTION
        
        # For low-speed corners, rely more on steering angle
        if speed < 50:  # km/h
            if abs(lateral_accel) < self.neutral_threshold:
                return VehicleDynamics.NEUTRAL
            # Simplified classification for low speed
            return VehicleDynamics.NEUTRAL
        
        # Calculate expected lateral acceleration based on speed and steering
        if speed > 0 and steering_angle != 0:
            # Simplified expected lateral acceleration calculation
            # This would ideally use vehicle parameters like wheelbase
            expected_lateral = (speed ** 2) * abs(steering_angle) / 1000  # Simplified formula
            
            # Compare actual vs expected
            lateral_error = abs(lateral_accel) - expected_lateral
            
            if abs(lateral_error) < self.neutral_threshold:
                return VehicleDynamics.NEUTRAL
            elif lateral_error > self.neutral_threshold:
                return VehicleDynamics.UNDERSTEER
            else:
                return VehicleDynamics.OVERSTEER
        
        return VehicleDynamics.NEUTRAL
    
    def analyze_handling_characteristics(self, telemetry_points: List[TelemetryDataPoint]) -> Dict[str, Any]:
        """Analyze overall handling characteristics"""
        if not telemetry_points:
            return {}
        
        dynamics_counts = {dynamics: 0 for dynamics in VehicleDynamics}
        oversteer_events = []
        understeer_events = []
        
        for i, point in enumerate(telemetry_points):
            # Calculate steering rate if possible
            steering_rate = None
            if i > 0 and hasattr(point, 'steering_angle') and hasattr(telemetry_points[i-1], 'steering_angle'):
                time_delta = point.time - telemetry_points[i-1].time
                if time_delta > 0:
                    steering_rate = (point.steering_angle - telemetry_points[i-1].steering_angle) / time_delta
            
            # Classify dynamics (using available data)
            lateral_accel = getattr(point, 'lateral_acceleration', 0.0)
            steering_angle = getattr(point, 'steering_angle', 0.0)
            
            dynamics = self.classify_dynamics(
                lateral_accel, steering_angle, point.speed or 0, steering_rate
            )
            dynamics_counts[dynamics] += 1
            
            # Record significant events
            if dynamics == VehicleDynamics.OVERSTEER:
                oversteer_events.append({
                    'time': point.time,
                    'speed': point.speed,
                    'lateral_accel': lateral_accel
                })
            elif dynamics == VehicleDynamics.UNDERSTEER:
                understeer_events.append({
                    'time': point.time,
                    'speed': point.speed,
                    'lateral_accel': lateral_accel
                })
        
        total_points = len(telemetry_points)
        dynamics_percentages = {
            dynamics: (count / total_points) * 100 
            for dynamics, count in dynamics_counts.items()
        }
        
        return {
            'dynamics_distribution': dynamics_percentages,
            'oversteer_events': oversteer_events,
            'understeer_events': understeer_events,
            'total_oversteer_events': len(oversteer_events),
            'total_understeer_events': len(understeer_events),
            'handling_balance': self._calculate_handling_balance(dynamics_percentages)
        }
    
    def _calculate_handling_balance(self, dynamics_percentages: Dict[VehicleDynamics, float]) -> str:
        """Calculate overall handling balance"""
        oversteer_pct = dynamics_percentages.get(VehicleDynamics.OVERSTEER, 0)
        understeer_pct = dynamics_percentages.get(VehicleDynamics.UNDERSTEER, 0)
        
        balance_ratio = oversteer_pct - understeer_pct
        
        if abs(balance_ratio) < 5:
            return "neutral"
        elif balance_ratio > 5:
            return "oversteer_tendency"
        else:
            return "understeer_tendency"

class TrackSectorAnalyzer:
    """Analyze track sectors and performance"""
    
    def __init__(self, num_sectors: int = 3):
        self.num_sectors = num_sectors
        self.action_classifier = DriverActionClassifier()
    
    def create_sectors(self, total_distance: float) -> List[Tuple[float, float]]:
        """Create sector boundaries based on total distance"""
        sector_length = total_distance / self.num_sectors
        sectors = []
        
        for i in range(self.num_sectors):
            start = i * sector_length
            end = (i + 1) * sector_length
            sectors.append((start, end))
        
        return sectors
    
    def analyze_sector(self, sector_num: int, start_dist: float, end_dist: float,
                      driver1_points: List[ComparisonPoint], 
                      driver2_points: List[ComparisonPoint],
                      driver1_name: str, driver2_name: str) -> SectorAnalysis:
        """Analyze a specific sector"""
        # Filter points for this sector
        sector_points = [
            p for p in driver1_points 
            if start_dist <= p.distance <= end_dist
        ]
        
        if not sector_points:
            # Return empty analysis
            return SectorAnalysis(
                sector_number=sector_num,
                start_distance=start_dist,
                end_distance=end_dist,
                driver1_sector_time=0,
                driver2_sector_time=0,
                time_difference=0,
                dominant_driver="unknown",
                max_speed_delta=0,
                avg_speed_delta=0,
                speed_advantage_distance=0,
                braking_points={driver1_name: [], driver2_name: []},
                throttle_application_points={driver1_name: [], driver2_name: []},
                corner_speeds={driver1_name: {"min_speed": 0, "max_speed": 0}, 
                              driver2_name: {"min_speed": 0, "max_speed": 0}},
                action_distribution={driver1_name: {}, driver2_name: {}}
            )
        
        # Calculate sector times (time to traverse the sector)
        first_point = sector_points[0]
        last_point = sector_points[-1]
        
        # Estimate sector times based on distance and speed
        driver1_times = [p.distance / (p.driver1_speed / 3.6) for p in sector_points if p.driver1_speed > 0]
        driver2_times = [p.distance / (p.driver2_speed / 3.6) for p in sector_points if p.driver2_speed > 0]
        
        driver1_sector_time = sum(driver1_times) if driver1_times else 0
        driver2_sector_time = sum(driver2_times) if driver2_times else 0
        time_difference = driver1_sector_time - driver2_sector_time
        dominant_driver = driver1_name if time_difference < 0 else driver2_name
        
        # Speed analysis
        speed_deltas = [p.speed_delta for p in sector_points]
        max_speed_delta = max(speed_deltas) if speed_deltas else 0
        avg_speed_delta = np.mean(speed_deltas) if speed_deltas else 0
        
        # Calculate distance where each driver has speed advantage
        driver1_advantage_points = sum(1 for p in sector_points if p.speed_delta < 0)
        speed_advantage_distance = (driver1_advantage_points / len(sector_points)) * (end_dist - start_dist)
        
        # Braking and throttle points
        driver1_braking = [p.distance for p in sector_points if p.driver1_action == DriverAction.BRAKING]
        driver2_braking = [p.distance for p in sector_points if p.driver2_action == DriverAction.BRAKING]
        
        driver1_throttle = [p.distance for p in sector_points if p.driver1_action == DriverAction.FULL_THROTTLE]
        driver2_throttle = [p.distance for p in sector_points if p.driver2_action == DriverAction.FULL_THROTTLE]
        
        # Corner speeds (min/max in sector)
        driver1_speeds = [p.driver1_speed for p in sector_points if p.driver1_speed > 0]
        driver2_speeds = [p.driver2_speed for p in sector_points if p.driver2_speed > 0]
        
        corner_speeds = {
            driver1_name: {
                "min_speed": min(driver1_speeds) if driver1_speeds else 0,
                "max_speed": max(driver1_speeds) if driver1_speeds else 0
            },
            driver2_name: {
                "min_speed": min(driver2_speeds) if driver2_speeds else 0,
                "max_speed": max(driver2_speeds) if driver2_speeds else 0
            }
        }
        
        # Action distribution
        driver1_actions = [p.driver1_action for p in sector_points]
        driver2_actions = [p.driver2_action for p in sector_points]
        
        driver1_action_dist = {
            action: (driver1_actions.count(action) / len(driver1_actions)) * 100
            for action in DriverAction
        } if driver1_actions else {}
        
        driver2_action_dist = {
            action: (driver2_actions.count(action) / len(driver2_actions)) * 100
            for action in DriverAction
        } if driver2_actions else {}
        
        return SectorAnalysis(
            sector_number=sector_num,
            start_distance=start_dist,
            end_distance=end_dist,
            driver1_sector_time=driver1_sector_time,
            driver2_sector_time=driver2_sector_time,
            time_difference=time_difference,
            dominant_driver=dominant_driver,
            max_speed_delta=max_speed_delta,
            avg_speed_delta=avg_speed_delta,
            speed_advantage_distance=speed_advantage_distance,
            braking_points={driver1_name: driver1_braking, driver2_name: driver2_braking},
            throttle_application_points={driver1_name: driver1_throttle, driver2_name: driver2_throttle},
            corner_speeds=corner_speeds,
            action_distribution={driver1_name: driver1_action_dist, driver2_name: driver2_action_dist}
        )

class DataComparisonEngine:
    """Main comparison engine orchestrating all analysis"""
    
    def __init__(self):
        self.alignment_engine = DataAlignmentEngine()
        self.action_classifier = DriverActionClassifier()
        self.dynamics_analyzer = VehicleDynamicsAnalyzer()
        self.sector_analyzer = TrackSectorAnalyzer()
        
    def compare_sessions(self, session1: SessionData, session2: SessionData,
                        use_fastest_laps: bool = True,
                        specific_lap1: Optional[int] = None,
                        specific_lap2: Optional[int] = None) -> ComparisonResult:
        """Perform comprehensive comparison between two sessions"""
        start_time = datetime.now()
        
        try:
            # Select laps for comparison
            lap1 = self._select_lap(session1, use_fastest_laps, specific_lap1)
            lap2 = self._select_lap(session2, use_fastest_laps, specific_lap2)
            
            if not lap1 or not lap2:
                raise ValueError("Could not find valid laps for comparison")
            
            # Align data using existing alignment engine
            alignment_result = self.alignment_engine.align_laps(lap1, lap2)
            
            if not alignment_result.success:
                raise ValueError(f"Data alignment failed: {alignment_result.error}")
            
            # Create comparison points
            comparison_points = self._create_comparison_points(
                alignment_result.aligned_data, session1.driver_name, session2.driver_name
            )
            
            # Perform sector analysis
            total_distance = max(p.distance for p in comparison_points)
            sectors = self.sector_analyzer.create_sectors(total_distance)
            sector_analysis = []
            
            for i, (start_dist, end_dist) in enumerate(sectors):
                sector = self.sector_analyzer.analyze_sector(
                    i + 1, start_dist, end_dist, comparison_points, comparison_points,
                    session1.driver_name, session2.driver_name
                )
                sector_analysis.append(sector)
            
            # Calculate overall metrics
            total_time_delta = comparison_points[-1].time_delta if comparison_points else 0
            faster_driver = session1.driver_name if total_time_delta < 0 else session2.driver_name
            
            # Generate summary analyses
            speed_analysis = self._analyze_speed_comparison(comparison_points)
            action_analysis = self._analyze_action_comparison(comparison_points, session1.driver_name, session2.driver_name)
            dynamics_analysis = self._analyze_dynamics_comparison(comparison_points, session1.driver_name, session2.driver_name)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ComparisonResult(
                driver1_name=session1.driver_name,
                driver2_name=session2.driver_name,
                lap1_number=specific_lap1 if specific_lap1 else (lap1.lap_number if lap1 else None),
                lap2_number=specific_lap2 if specific_lap2 else (lap2.lap_number if lap2 else None),
                total_time_delta=total_time_delta,
                faster_driver=faster_driver,
                total_distance=total_distance,
                data_points=len(comparison_points),
                comparison_points=comparison_points,
                sector_analysis=sector_analysis,
                speed_analysis=speed_analysis,
                action_analysis=action_analysis,
                dynamics_analysis=dynamics_analysis,
                analysis_timestamp=datetime.now(),
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Comparison engine error: {e}")
            raise
    
    def _select_lap(self, session: SessionData, use_fastest: bool, 
                   specific_lap: Optional[int]) -> Optional[LapData]:
        """Select the appropriate lap for comparison"""
        if specific_lap is not None:
            for lap in session.laps:
                if lap.lap_number == specific_lap:
                    return lap
            return None
        
        if use_fastest and session.fastest_lap:
            return session.fastest_lap
        
        # Return first valid lap if no fastest lap
        return session.laps[0] if session.laps else None
    
    def _create_comparison_points(self, aligned_data: Dict[str, Any], 
                                driver1_name: str, driver2_name: str) -> List[ComparisonPoint]:
        """Create comparison points from aligned data"""
        comparison_points = []
        
        if 'distance_meters' not in aligned_data:
            return comparison_points
        
        distances = aligned_data['distance_meters']
        
        for i, distance in enumerate(distances):
            try:
                # Extract data for both drivers
                driver1_data = {
                    'speed': aligned_data.get('driver1_speed', [0] * len(distances))[i],
                    'throttle': aligned_data.get('driver1_throttle', [0] * len(distances))[i],
                    'brake': aligned_data.get('driver1_brake', [0] * len(distances))[i],
                    'gear': aligned_data.get('driver1_gear', [1] * len(distances))[i],
                    'rpm': aligned_data.get('driver1_rpm', [0] * len(distances))[i],
                    'time': aligned_data.get('driver1_time', [0] * len(distances))[i],
                }
                
                driver2_data = {
                    'speed': aligned_data.get('driver2_speed', [0] * len(distances))[i],
                    'throttle': aligned_data.get('driver2_throttle', [0] * len(distances))[i],
                    'brake': aligned_data.get('driver2_brake', [0] * len(distances))[i],
                    'gear': aligned_data.get('driver2_gear', [1] * len(distances))[i],
                    'rpm': aligned_data.get('driver2_rpm', [0] * len(distances))[i],
                    'time': aligned_data.get('driver2_time', [0] * len(distances))[i],
                }
                
                # Calculate deltas
                time_delta = driver1_data['time'] - driver2_data['time']
                speed_delta = driver1_data['speed'] - driver2_data['speed']
                throttle_delta = driver1_data['throttle'] - driver2_data['throttle']
                brake_delta = driver1_data['brake'] - driver2_data['brake']
                gear_delta = driver1_data['gear'] - driver2_data['gear']
                rpm_delta = driver1_data['rpm'] - driver2_data['rpm']
                
                # Classify actions and dynamics
                driver1_action = self.action_classifier.classify_action(
                    driver1_data['throttle'], driver1_data['brake']
                )
                driver2_action = self.action_classifier.classify_action(
                    driver2_data['throttle'], driver2_data['brake']
                )
                
                # Simple dynamics classification (would need more data for full analysis)
                driver1_dynamics = VehicleDynamics.NEUTRAL
                driver2_dynamics = VehicleDynamics.NEUTRAL
                
                comparison_point = ComparisonPoint(
                    distance=distance,
                    time_delta=time_delta,
                    speed_delta=speed_delta,
                    throttle_delta=throttle_delta,
                    brake_delta=brake_delta,
                    gear_delta=gear_delta,
                    rpm_delta=rpm_delta,
                    driver1_speed=driver1_data['speed'],
                    driver1_throttle=driver1_data['throttle'],
                    driver1_brake=driver1_data['brake'],
                    driver1_action=driver1_action,
                    driver1_dynamics=driver1_dynamics,
                    driver2_speed=driver2_data['speed'],
                    driver2_throttle=driver2_data['throttle'],
                    driver2_brake=driver2_data['brake'],
                    driver2_action=driver2_action,
                    driver2_dynamics=driver2_dynamics
                )
                
                comparison_points.append(comparison_point)
                
            except (IndexError, KeyError) as e:
                logger.warning(f"Error creating comparison point at index {i}: {e}")
                continue
        
        return comparison_points
    
    def _analyze_speed_comparison(self, points: List[ComparisonPoint]) -> Dict[str, Any]:
        """Analyze speed comparison between drivers"""
        if not points:
            return {}
        
        speed_deltas = [p.speed_delta for p in points]
        
        return {
            'max_speed_advantage': max(speed_deltas),
            'max_speed_deficit': min(speed_deltas),
            'avg_speed_delta': np.mean(speed_deltas),
            'speed_advantage_percentage': (sum(1 for d in speed_deltas if d > 0) / len(speed_deltas)) * 100,
            'top_speed_zones': self._find_top_speed_zones(points),
            'speed_consistency': np.std(speed_deltas)
        }
    
    def _analyze_action_comparison(self, points: List[ComparisonPoint], 
                                 driver1_name: str, driver2_name: str) -> Dict[str, Any]:
        """Analyze driver actions comparison"""
        if not points:
            return {}
        
        driver1_actions = [p.driver1_action for p in points]
        driver2_actions = [p.driver2_action for p in points]
        
        driver1_analysis = self.action_classifier.analyze_action_sequence(
            [p.driver1_throttle for p in points],
            [p.driver1_brake for p in points]
        )
        
        driver2_analysis = self.action_classifier.analyze_action_sequence(
            [p.driver2_throttle for p in points],
            [p.driver2_brake for p in points]
        )
        
        return {
            driver1_name: driver1_analysis,
            driver2_name: driver2_analysis,
            'action_differences': self._compare_action_distributions(
                driver1_analysis['action_distribution'],
                driver2_analysis['action_distribution']
            )
        }
    
    def _analyze_dynamics_comparison(self, points: List[ComparisonPoint],
                                   driver1_name: str, driver2_name: str) -> Dict[str, Any]:
        """Analyze vehicle dynamics comparison"""
        # This would be expanded with actual dynamics analysis
        return {
            driver1_name: {'handling_balance': 'neutral'},
            driver2_name: {'handling_balance': 'neutral'},
            'comparison_summary': 'Both drivers show neutral handling characteristics'
        }
    
    def _find_top_speed_zones(self, points: List[ComparisonPoint]) -> List[Dict[str, Any]]:
        """Find zones where drivers reach top speeds"""
        zones = []
        current_zone = None
        
        for i, point in enumerate(points):
            # Define top speed as > 150 km/h
            if point.driver1_speed > 150 or point.driver2_speed > 150:
                if current_zone is None:
                    current_zone = {
                        'start_distance': point.distance,
                        'start_index': i,
                        'max_speed_driver1': point.driver1_speed,
                        'max_speed_driver2': point.driver2_speed
                    }
                else:
                    current_zone['max_speed_driver1'] = max(current_zone['max_speed_driver1'], point.driver1_speed)
                    current_zone['max_speed_driver2'] = max(current_zone['max_speed_driver2'], point.driver2_speed)
            else:
                if current_zone is not None:
                    current_zone['end_distance'] = points[i-1].distance if i > 0 else point.distance
                    current_zone['end_index'] = i - 1
                    zones.append(current_zone)
                    current_zone = None
        
        # Close final zone if needed
        if current_zone is not None:
            current_zone['end_distance'] = points[-1].distance
            current_zone['end_index'] = len(points) - 1
            zones.append(current_zone)
        
        return zones
    
    def _compare_action_distributions(self, dist1: Dict[DriverAction, float], 
                                    dist2: Dict[DriverAction, float]) -> Dict[str, float]:
        """Compare action distributions between drivers"""
        differences = {}
        all_actions = set(dist1.keys()) | set(dist2.keys())
        
        for action in all_actions:
            pct1 = dist1.get(action, 0)
            pct2 = dist2.get(action, 0)
            differences[action.value] = pct1 - pct2
        
        return differences