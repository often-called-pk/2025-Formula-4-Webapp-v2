#!/usr/bin/env python3
"""
Direct test of data processor
"""

import pandas as pd
import sys
import os

# Add the current directory to Python path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_processor import TelemetryProcessor

def main():
    csv_path = "Abhay Mohan Round 3 Race 1 Telemetry.csv"
    
    print("🔄 Testing direct processor call...")
    
    # Read CSV exactly like the test script does
    df = pd.read_csv(csv_path)
    print(f"📊 CSV shape: {df.shape}")
    
    # Initialize processor
    processor = TelemetryProcessor()
    
    # Call the metadata extraction directly to see debug output
    print("\n🔍 Calling _extract_metadata directly...")
    metadata, df_processed = processor._extract_metadata(df)
    
    print(f"\n📋 Metadata results ({len(metadata)} items):")
    for key, value in metadata.items():
        print(f"   {key}: {value}")
    
    # Now test the full processing
    print("\n🔄 Testing full processing...")
    result = processor.process_single_file(df, "test_file.csv", "test_session")
    
    print(f"✅ Processing result: {result.success}")
    print(f"📋 Message: {result.message}")
    print(f"🎯 Laps detected: {result.metadata.get('laps_detected', 0) if result.metadata else 0}")

if __name__ == "__main__":
    main() 