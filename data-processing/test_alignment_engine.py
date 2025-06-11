import unittest
import pandas as pd
import numpy as np
import sys
import os
from typing import List

# Add the services directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'services'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'models'))

from services.data_alignment import DataAlignmentEngine, ComparisonCalculator
from services.data_processor import TelemetryProcessor
from models.telemetry_models import SessionData, LapData, TelemetryDataPoint

class TestDataAlignmentEngine(unittest.TestCase):
    """Test cases for the Data Alignment and Comparison Engine"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.alignment_engine = DataAlignmentEngine()
        self.comparison_calculator = ComparisonCalculator()
        self.processor = TelemetryProcessor()
        
    def create_test_lap_data(self, driver_name: str, lap_number: int, 
                           base_speed: float = 100.0) -> LapData:
        """Create synthetic lap data for testing"""
        data_points = []
        
        # Create 200 data points (10 seconds at 20Hz)
        for i in range(200):
            time = i * 0.05  # 20Hz sampling
            
            # Simulate a lap with varying speed, throttle, and brake
            # Create corners at 1/4 and 3/4 through the lap
            corner1_factor = 1.0 - 0.4 * np.exp(-((i - 50) / 20)**2)  # Corner around point 50
            corner2_factor = 1.0 - 0.3 * np.exp(-((i - 150) / 25)**2)  # Corner around point 150
            
            speed = base_speed * corner1_factor * corner2_factor + np.random.normal(0, 2)
            speed = max(20, min(200, speed))  # Clamp speed between 20-200 km/h
            
            # Throttle inversely related to braking zones
            throttle = max(0, min(100, 80 * corner1_factor * corner2_factor + np.random.normal(0, 5)))
            
            # Brake in corners
            brake = max(0, min(100, 40 * (1 - corner1_factor) + 30 * (1 - corner2_factor)))
            
            # Simple gear calculation based on speed
            gear = min(6, max(1, int(speed / 35) + 1))
            
            # RPM based on gear and speed
            rpm = min(12000, max(2000, speed * 50 + gear * 500))
            
            # Simulate GPS coordinates (simple track)
            lat = 37.4419 + 0.001 * np.sin(2 * np.pi * i / 200)
            lon = -122.1430 + 0.001 * np.cos(2 * np.pi * i / 200)
            
            point = TelemetryDataPoint(
                time=time,
                speed=speed,
                throttle_pos=throttle,
                brake_pos=brake,
                gear=gear,
                rpm=rpm,
                water_temp=80 + np.random.normal(0, 2),
                oil_temp=85 + np.random.normal(0, 2),
                gps_latitude=lat,
                gps_longitude=lon
            )
            data_points.append(point)
        
        return LapData(
            lap_number=lap_number,
            start_time=0.0,
            end_time=10.0,
            lap_time=65.0 + np.random.normal(0, 2),  # ~65 second lap
            data_points=data_points,
            is_fastest=lap_number == 1
        )
    
    def create_test_session(self, driver_name: str, num_laps: int = 3) -> SessionData:
        """Create a test session with multiple laps"""
        laps = []
        for i in range(num_laps):
            # Vary base speed slightly for each driver/lap
            base_speed = 100 + (hash(driver_name) % 20) - 10  # Different base speeds
            lap = self.create_test_lap_data(driver_name, i + 1, base_speed)
            laps.append(lap)
        
        # Set fastest lap (first lap)
        fastest_lap = laps[0]
        fastest_lap.is_fastest = True
        
        return SessionData(
            driver_name=driver_name,
            session_name="Test Session",
            track_name="Test Track",
            laps=laps,
            fastest_lap=fastest_lap,
            metadata={"Racer": driver_name, "Session": "Test"}
        )
    
    def test_distance_alignment_calculation(self):
        """Test distance calculation from GPS coordinates"""
        # Test basic distance calculation
        distance = self.alignment_engine._calculate_gps_distance(
            37.4419, -122.1430,  # Point 1
            37.4420, -122.1431   # Point 2 (slight offset)
        )
        
        self.assertGreater(distance, 0, "Distance should be positive")
        self.assertLess(distance, 200, "Distance should be reasonable for small GPS offset")
        
    def test_lap_distance_alignment(self):
        """Test distance alignment calculation for a lap"""
        lap = self.create_test_lap_data("Test Driver", 1)
        aligned_points = self.alignment_engine._calculate_distance_alignment(lap)
        
        self.assertIsNotNone(aligned_points, "Alignment should not return None")
        self.assertEqual(len(aligned_points), len(lap.data_points), 
                        "Should have same number of aligned points as original")
        
        # Check that distance is monotonically increasing
        distances = [point["distance"] for point in aligned_points]
        for i in range(1, len(distances)):
            self.assertGreaterEqual(distances[i], distances[i-1], 
                                  "Distance should be monotonically increasing")
        
        # First point should be at distance 0
        self.assertEqual(aligned_points[0]["distance"], 0.0, 
                        "First point should be at distance 0")
        
        # Last point should have positive distance
        self.assertGreater(aligned_points[-1]["distance"], 0, 
                          "Last point should have positive distance")
    
    def test_data_interpolation(self):
        """Test data interpolation functionality"""
        lap = self.create_test_lap_data("Test Driver", 1)
        aligned_points = self.alignment_engine._calculate_distance_alignment(lap)
        
        # Create target distances every 50 meters
        target_distances = np.arange(0, 1000, 50)
        interpolated = self.alignment_engine._interpolate_lap_data(aligned_points, target_distances)
        
        self.assertIn("speed", interpolated, "Speed should be interpolated")
        self.assertIn("throttle", interpolated, "Throttle should be interpolated")
        self.assertIn("brake", interpolated, "Brake should be interpolated")
        
        # Check interpolated data length
        self.assertEqual(len(interpolated["speed"]), len(target_distances), 
                        "Interpolated data should match target distance array length")
        
        # Check that interpolated values are reasonable
        speeds = interpolated["speed"]
        self.assertTrue(all(0 <= s <= 300 for s in speeds), 
                       "All interpolated speeds should be within reasonable range")
    
    def test_session_alignment(self):
        """Test alignment between two complete sessions"""
        session1 = self.create_test_session("Driver A")
        session2 = self.create_test_session("Driver B")
        
        result = self.alignment_engine.align_sessions(session1, session2)
        
        self.assertTrue(result["success"], f"Alignment should succeed: {result.get('error', '')}")
        self.assertIn("aligned_data", result, "Result should contain aligned data")
        self.assertIn("comparison_metrics", result, "Result should contain comparison metrics")
        self.assertIn("sector_analysis", result, "Result should contain sector analysis")
        
        # Check aligned data structure
        aligned_data = result["aligned_data"]
        self.assertIn("distance", aligned_data, "Aligned data should have distance array")
        self.assertIn("driver1", aligned_data, "Aligned data should have driver1 data")
        self.assertIn("driver2", aligned_data, "Aligned data should have driver2 data")
        
        # Check that both drivers have the same number of data points
        driver1_speed = aligned_data["driver1"].get("speed", [])
        driver2_speed = aligned_data["driver2"].get("speed", [])
        distance_points = aligned_data["distance"]
        
        self.assertEqual(len(driver1_speed), len(distance_points), 
                        "Driver 1 speed should match distance array length")
        self.assertEqual(len(driver2_speed), len(distance_points), 
                        "Driver 2 speed should match distance array length")
        self.assertEqual(len(driver1_speed), len(driver2_speed), 
                        "Both drivers should have same number of data points")
    
    def test_comparison_metrics(self):
        """Test comparison metrics calculation"""
        session1 = self.create_test_session("Driver A")
        session2 = self.create_test_session("Driver B")
        
        result = self.alignment_engine.align_sessions(session1, session2)
        self.assertTrue(result["success"], "Alignment should succeed for metrics test")
        
        metrics = result["comparison_metrics"]
        
        # Check for expected metric categories
        self.assertIn("speed_comparison", metrics, "Should have speed comparison metrics")
        self.assertIn("performance_summary", metrics, "Should have performance summary")
        
        # Check speed comparison structure
        speed_comp = metrics["speed_comparison"]
        self.assertIn("max_speed_advantage_driver1", speed_comp)
        self.assertIn("max_speed_advantage_driver2", speed_comp)
        self.assertIn("avg_speed_difference", speed_comp)
        self.assertIn("speed_advantage_distance", speed_comp)
        
        # Verify speed advantage is numeric
        self.assertIsInstance(speed_comp["max_speed_advantage_driver1"], (int, float))
        self.assertIsInstance(speed_comp["max_speed_advantage_driver2"], (int, float))
    
    def test_sector_analysis(self):
        """Test sector-based performance analysis"""
        session1 = self.create_test_session("Driver A")
        session2 = self.create_test_session("Driver B")
        
        result = self.alignment_engine.align_sessions(session1, session2)
        self.assertTrue(result["success"], "Alignment should succeed for sector test")
        
        sector_analysis = result["sector_analysis"]
        
        # Should have 3 sectors by default
        self.assertIn("sector_1", sector_analysis, "Should have sector 1")
        self.assertIn("sector_2", sector_analysis, "Should have sector 2")
        self.assertIn("sector_3", sector_analysis, "Should have sector 3")
        
        # Check sector structure
        sector1 = sector_analysis["sector_1"]
        if "avg_speed" in sector1:
            self.assertIn("driver1", sector1["avg_speed"])
            self.assertIn("driver2", sector1["avg_speed"])
            self.assertIn("advantage", sector1["avg_speed"])
            self.assertIn("difference", sector1["avg_speed"])
    
    def test_cornering_analysis(self):
        """Test cornering performance analysis"""
        session1 = self.create_test_session("Driver A")
        session2 = self.create_test_session("Driver B")
        
        result = self.alignment_engine.align_sessions(session1, session2)
        self.assertTrue(result["success"], "Alignment should succeed for cornering test")
        
        # Test cornering analysis
        cornering_analysis = self.comparison_calculator.calculate_cornering_analysis(
            result["aligned_data"]
        )
        
        # Should detect cornering zones and braking analysis
        if "cornering_zones" in cornering_analysis:
            zones = cornering_analysis["cornering_zones"]
            self.assertIn("driver1_corner_percentage", zones)
            self.assertIn("driver2_corner_percentage", zones)
            
        if "braking_analysis" in cornering_analysis:
            braking = cornering_analysis["braking_analysis"]
            self.assertIn("heavy_braking_percentage_driver1", braking)
            self.assertIn("heavy_braking_percentage_driver2", braking)
    
    def test_processor_integration(self):
        """Test integration with TelemetryProcessor"""
        session1 = self.create_test_session("Driver A")
        session2 = self.create_test_session("Driver B")
        
        # Test detailed comparison
        result = self.processor.compare_sessions_detailed(session1, session2)
        
        self.assertTrue(result["success"], f"Detailed comparison should succeed: {result.get('error', '')}")
        self.assertIn("cornering_analysis", result, "Should include cornering analysis")
        self.assertIn("oversteer_understeer_analysis", result, "Should include oversteer analysis")
        self.assertEqual(result["analysis_type"], "detailed_comparison")
        
        # Test lap comparison data
        viz_result = self.processor.get_lap_comparison_data(session1, session2)
        
        self.assertTrue(viz_result["success"], f"Lap comparison should succeed: {viz_result.get('error', '')}")
        self.assertIn("channels", viz_result, "Should have channels data")
        self.assertIn("lap_info", viz_result, "Should have lap info")
        
        # Check channel structure
        channels = viz_result["channels"]
        self.assertIn("speed", channels, "Should have speed channel")
        self.assertIn("throttle", channels, "Should have throttle channel")
        self.assertIn("brake", channels, "Should have brake channel")
        
        # Check that each channel has both drivers' data
        speed_data = channels["speed"]
        self.assertIn("driver1", speed_data, "Speed should have driver1 data")
        self.assertIn("driver2", speed_data, "Speed should have driver2 data")

if __name__ == '__main__':
    # Create a test runner
    unittest.main(verbosity=2) 