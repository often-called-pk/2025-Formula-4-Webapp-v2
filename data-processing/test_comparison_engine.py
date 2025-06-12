#!/usr/bin/env python3
"""
Test script for the Data Comparison Engine

This script tests the advanced comparison functionality including:
- Driver action classification
- Vehicle dynamics analysis  
- Track sector analysis
- Performance metrics calculation
"""

import sys
import os
import asyncio
from typing import List
import pandas as pd
import numpy as np
from datetime import datetime

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.comparison_engine import (
    DataComparisonEngine, DriverActionClassifier, VehicleDynamicsAnalyzer, 
    TrackSectorAnalyzer, DriverAction, VehicleDynamics
)
from models.telemetry_models import SessionData, LapData, TelemetryDataPoint

def create_test_session_data(driver_name: str, lap_time: float, num_points: int = 100) -> SessionData:
    """Create realistic test session data"""
    
    # Generate realistic telemetry data
    data_points = []
    distance = 0
    
    for i in range(num_points):
        # Simulate a lap with different phases
        progress = i / num_points
        
        # Speed profile - slower in corners, faster on straights
        if 0.2 <= progress <= 0.3 or 0.6 <= progress <= 0.8:  # Corner sections
            speed = 80 + np.random.normal(0, 5)  # Corner speeds
            throttle = 30 + np.random.normal(0, 10)
            brake = 20 + max(0, np.random.normal(10, 5))
        else:  # Straight sections
            speed = 180 + np.random.normal(0, 10)  # Straight speeds
            throttle = 95 + np.random.normal(0, 3)
            brake = 0 + max(0, np.random.normal(0, 2))
        
        # Ensure realistic ranges
        speed = max(30, min(250, speed))
        throttle = max(0, min(100, throttle))
        brake = max(0, min(100, brake))
        
        # Gear calculation based on speed
        if speed < 50:
            gear = 2
        elif speed < 80:
            gear = 3
        elif speed < 120:
            gear = 4
        elif speed < 160:
            gear = 5
        else:
            gear = 6
        
        # RPM roughly correlates with speed and gear
        rpm = (speed * 100) + np.random.normal(0, 200)
        rpm = max(2000, min(8000, rpm))
        
        # Distance calculation
        time_delta = lap_time / num_points
        distance += (speed / 3.6) * time_delta  # Convert km/h to m/s
        
        # GPS coordinates (simulated track)
        lat = 45.0 + (progress * 0.01) + np.random.normal(0, 0.0001)
        lon = 2.0 + (progress * 0.02) + np.random.normal(0, 0.0001)
        
        point = TelemetryDataPoint(
            time=i * time_delta,
            speed=speed,
            distance=distance,
            throttle_pos=throttle,
            brake_pos=brake,
            gear=gear,
            rpm=rpm,
            gps_latitude=lat,
            gps_longitude=lon,
            water_temp=85 + np.random.normal(0, 3),
            oil_temp=105 + np.random.normal(0, 5)
        )
        
        data_points.append(point)
    
    # Create lap data
    lap = LapData(
        lap_number=1,
        start_time=0.0,
        end_time=lap_time,
        lap_time=lap_time,
        data_points=data_points,
        is_fastest=True
    )
    
    # Create session data
    session = SessionData(
        driver_name=driver_name,
        session_name="Test Session",
        track_name="Test Track",
        laps=[lap],
        fastest_lap=lap,
        metadata={
            "Championship": "Test Championship",
            "Vehicle": "Formula 4",
            "Duration": lap_time
        }
    )
    
    return session

def test_driver_action_classifier():
    """Test driver action classification"""
    print("Testing Driver Action Classifier...")
    
    classifier = DriverActionClassifier()
    
    # Test cases
    test_cases = [
        (100, 0, DriverAction.FULL_THROTTLE),
        (50, 0, DriverAction.PARTIAL_THROTTLE),
        (5, 0, DriverAction.COASTING),
        (0, 50, DriverAction.BRAKING),
        (20, 10, DriverAction.TRAIL_BRAKING),
    ]
    
    for throttle, brake, expected in test_cases:
        result = classifier.classify_action(throttle, brake)
        status = "✅" if result == expected else "❌"
        print(f"  {status} Throttle: {throttle}%, Brake: {brake}% → {result.value}")
    
    # Test action sequence analysis
    throttle_data = [100, 90, 80, 30, 0, 0, 20, 60, 100]
    brake_data = [0, 0, 5, 20, 50, 30, 0, 0, 0]
    
    analysis = classifier.analyze_action_sequence(throttle_data, brake_data)
    print(f"  Action distribution: {analysis['action_distribution']}")
    print(f"  Dominant action: {analysis['dominant_action']}")
    print(f"  Total transitions: {analysis['total_transitions']}")

def test_vehicle_dynamics_analyzer():
    """Test vehicle dynamics analysis"""
    print("\nTesting Vehicle Dynamics Analyzer...")
    
    analyzer = VehicleDynamicsAnalyzer()
    
    # Test cases for dynamics classification
    test_cases = [
        (0.1, 5, 100, VehicleDynamics.NEUTRAL),
        (0.5, 10, 150, VehicleDynamics.UNDERSTEER),
        (-0.3, 8, 120, VehicleDynamics.OVERSTEER),
    ]
    
    for lateral_accel, steering, speed, expected in test_cases:
        result = analyzer.classify_dynamics(lateral_accel, steering, speed)
        status = "✅" if result == expected else "❌" 
        print(f"  {status} Lat Accel: {lateral_accel}g, Steering: {steering}°, Speed: {speed}km/h → {result.value}")

def test_track_sector_analyzer():
    """Test track sector analysis"""
    print("\nTesting Track Sector Analyzer...")
    
    analyzer = TrackSectorAnalyzer(num_sectors=3)
    
    # Test sector creation
    total_distance = 3000  # 3km track
    sectors = analyzer.create_sectors(total_distance)
    
    print(f"  Created {len(sectors)} sectors:")
    for i, (start, end) in enumerate(sectors):
        print(f"    Sector {i+1}: {start:.0f}m - {end:.0f}m")

def test_data_comparison_engine():
    """Test the complete data comparison engine"""
    print("\nTesting Data Comparison Engine...")
    
    # Create test sessions with different characteristics
    session1 = create_test_session_data("Driver A", 95.5, 150)  # Faster driver
    session2 = create_test_session_data("Driver B", 97.2, 150)  # Slower driver
    
    print(f"  Session 1: {session1.driver_name}, Fastest lap: {session1.fastest_lap.lap_time:.3f}s")
    print(f"  Session 2: {session2.driver_name}, Fastest lap: {session2.fastest_lap.lap_time:.3f}s")
    
    # Perform comparison
    engine = DataComparisonEngine()
    
    try:
        start_time = datetime.now()
        result = engine.compare_sessions(session1, session2)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        print(f"  ✅ Comparison completed in {processing_time:.3f}s")
        print(f"  Faster driver: {result.faster_driver}")
        print(f"  Time delta: {result.total_time_delta:.3f}s")
        print(f"  Total distance: {result.total_distance:.0f}m")
        print(f"  Data points: {result.data_points}")
        print(f"  Sectors analyzed: {len(result.sector_analysis)}")
        
        # Display speed analysis
        if result.speed_analysis:
            print(f"  Max speed advantage: {result.speed_analysis.get('max_speed_advantage', 0):.1f} km/h")
            print(f"  Avg speed delta: {result.speed_analysis.get('avg_speed_delta', 0):.1f} km/h")
            print(f"  Speed consistency: {result.speed_analysis.get('speed_consistency', 0):.2f}")
        
        # Display sector analysis summary
        if result.sector_analysis:
            print(f"  Sector breakdown:")
            for sector in result.sector_analysis:
                print(f"    Sector {sector.sector_number}: {sector.dominant_driver} by {abs(sector.time_difference):.3f}s")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Comparison failed: {e}")
        return False

def test_performance_metrics():
    """Test performance metrics calculation"""
    print("\nTesting Performance Metrics...")
    
    session = create_test_session_data("Test Driver", 94.8, 120)
    
    # Calculate basic metrics
    lap = session.fastest_lap
    speeds = [p.speed for p in lap.data_points if p.speed]
    throttle = [p.throttle_pos for p in lap.data_points if p.throttle_pos]
    brake = [p.brake_pos for p in lap.data_points if p.brake_pos]
    
    if speeds and throttle and brake:
        print(f"  ✅ Speed stats: Max: {max(speeds):.1f}, Min: {min(speeds):.1f}, Avg: {np.mean(speeds):.1f} km/h")
        print(f"  ✅ Throttle stats: Max: {max(throttle):.1f}%, Avg: {np.mean(throttle):.1f}%")
        print(f"  ✅ Brake stats: Max: {max(brake):.1f}%, Avg: {np.mean(brake):.1f}%")
        print(f"  ✅ Data points: {len(lap.data_points)}")
        return True
    else:
        print(f"  ❌ Missing telemetry data")
        return False

async def run_all_tests():
    """Run all comparison engine tests"""
    print("🏁 Formula 4 Data Comparison Engine Test Suite")
    print("=" * 50)
    
    tests = [
        test_driver_action_classifier,
        test_vehicle_dynamics_analyzer,
        test_track_sector_analyzer,
        test_performance_metrics,
        test_data_comparison_engine,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"  ❌ Test failed with error: {e}")
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Comparison engine is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    import asyncio
    
    # Run the test suite
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)