#!/usr/bin/env python3
"""
Test script for data cleaning and lap detection functionality
"""

import pandas as pd
import sys
import os

# Add the current directory to Python path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_cleaner import DataCleaner, LapDetector
from services.data_processor import TelemetryProcessor

def test_csv_parsing():
    """Test CSV parsing with a sample telemetry file"""
    
    # Path to sample CSV file (relative to project root)
    csv_path = "../Abhay Mohan Round 3 Race 1 Telemetry.csv"
    
    if not os.path.exists(csv_path):
        print(f"❌ Sample CSV file not found: {csv_path}")
        return False
    
    try:
        print("🔄 Testing CSV parsing and data cleaning...")
        
        # Initialize processor
        processor = TelemetryProcessor()
        
        # Read CSV file
        print(f"📁 Reading CSV file: {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"✅ Initial CSV shape: {df.shape}")
        
        # Process the file
        result = processor.process_single_file(df, "test_file.csv", "test_session")
        
        if result.success:
            print(f"✅ Processing successful!")
            print(f"   - Message: {result.message}")
            print(f"   - Rows processed: {result.rows_processed}")
            print(f"   - Fastest lap time: {result.fastest_lap_time}")
            print(f"   - Laps detected: {result.metadata.get('laps_detected', 0)}")
            
            # Print some metadata
            if result.metadata:
                print("📊 Metadata extracted:")
                for key, value in result.metadata.items():
                    if key != 'session_data':  # Skip the large session data
                        print(f"   - {key}: {value}")
                        
            return True
        else:
            print(f"❌ Processing failed: {result.message}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_data_cleaning():
    """Test data cleaning functionality"""
    
    print("\n🧹 Testing data cleaning functionality...")
    
    try:
        # Create sample data with issues
        test_data = {
            'Time': [0, 0.05, 0.1, 0.15, 0.2, None, 0.3],
            'Speed': [0, 50, 100, 150, 999, 200, 180],  # 999 is an outlier
            'Throttle Pos': [0, 0.5, 0.8, 1.2, 0.9, 0.7, 0.6],  # 1.2 > 1.0 (if in 0-1 range)
            'Distance on Vehicle Speed': [0, 10, 20, 30, 40, None, 60]
        }
        
        df_test = pd.DataFrame(test_data)
        print(f"📊 Test data shape: {df_test.shape}")
        print("Raw data preview:")
        print(df_test)
        
        # Clean the data
        cleaner = DataCleaner()
        df_clean = cleaner.clean_data(df_test)
        
        print("\n✨ Cleaned data preview:")
        print(df_clean)
        print("✅ Data cleaning test completed!")
        
        return True
        
    except Exception as e:
        print(f"❌ Data cleaning test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_lap_detection():
    """Test lap detection functionality"""
    
    print("\n🏁 Testing lap detection functionality...")
    
    try:
        # Create sample metadata
        sample_metadata = {
            'Beacon Markers': '60.83,247.861,353.438,455.58,557.003',
            'Segment Times': '01:00.8,03:07.0,01:45.6,01:42.1,01:41.4',
            'Racer': 'Test Driver',
            'Session': 'Test Session'
        }
        
        # Create sample telemetry data
        time_points = []
        current_time = 0
        for i in range(1000):  # 50 seconds of data at 20Hz
            time_points.append(current_time)
            current_time += 0.05
            
        sample_data = {
            'Time': time_points,
            'Speed': [50 + (i % 100) for i in range(1000)],  # Varying speed
            'Distance on Vehicle Speed': [i * 0.5 for i in range(1000)],  # Increasing distance
            'Throttle Pos': [50 + (i % 50) for i in range(1000)],
            'GPS Latitude': [13.0 + (i * 0.0001) for i in range(1000)],
            'GPS Longitude': [79.9 + (i * 0.0001) for i in range(1000)]
        }
        
        df_test = pd.DataFrame(sample_data)
        
        # Test lap detection
        detector = LapDetector()
        laps = detector.detect_laps_from_metadata(sample_metadata, df_test)
        
        print(f"✅ Detected {len(laps)} laps")
        
        for lap in laps:
            print(f"   Lap {lap.lap_number}: {lap.lap_time:.1f}s ({lap.start_time:.1f}s - {lap.end_time:.1f}s)")
            if lap.is_fastest:
                print(f"   ⚡ Fastest lap!")
        
        return True
        
    except Exception as e:
        print(f"❌ Lap detection test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🧪 Starting Data Cleaning and Lap Detection Tests\n")
    
    tests = [
        test_data_cleaning,
        test_lap_detection,
        test_csv_parsing,
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
            results.append(False)
    
    print(f"\n📊 Test Results:")
    print(f"   ✅ Passed: {sum(results)}/{len(results)}")
    print(f"   ❌ Failed: {len(results) - sum(results)}/{len(results)}")
    
    if all(results):
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n💥 Some tests failed!")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 