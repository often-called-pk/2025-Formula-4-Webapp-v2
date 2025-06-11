#!/usr/bin/env python3
"""
Debug script to investigate metadata extraction from real CSV files
"""

import pandas as pd
import sys
import os

# Add the current directory to Python path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.data_processor import TelemetryProcessor

def debug_metadata_extraction():
    """Debug metadata extraction from real CSV file"""
    
    csv_path = "Abhay Mohan Round 3 Race 1 Telemetry.csv"
    
    if not os.path.exists(csv_path):
        print(f"❌ Sample CSV file not found: {csv_path}")
        return
    
    print("🔍 Debugging metadata extraction...")
    
    # Read raw CSV
    df = pd.read_csv(csv_path, dtype=str)  # Read as strings to preserve formatting
    print(f"📊 CSV shape: {df.shape}")
    
    # Debug the exact rows we're interested in
    print("\n🎯 Debugging specific rows:")
    for i in range(min(15, len(df))):
        row = df.iloc[i]
        key = str(row.iloc[0]) if pd.notna(row.iloc[0]) else "nan"
        print(f"Row {i:2d}: Key='{key}'")
        
        if key == 'Beacon Markers':
            print(f"   Found Beacon Markers row!")
            beacon_values = []
            for col_idx in range(1, min(len(row), 25)):  # Check first 25 columns
                if pd.notna(row.iloc[col_idx]):
                    val_str = str(row.iloc[col_idx]).strip()
                    if val_str and val_str != 'nan':
                        beacon_values.append(val_str)
                        print(f"     Col {col_idx}: '{val_str}'")
            print(f"   Collected {len(beacon_values)} beacon values")
            
        elif key == 'Segment Times':
            print(f"   Found Segment Times row!")
            segment_values = []
            for col_idx in range(1, min(len(row), 25)):  # Check first 25 columns
                if pd.notna(row.iloc[col_idx]):
                    val_str = str(row.iloc[col_idx]).strip()
                    if val_str and val_str != 'nan':
                        segment_values.append(val_str)
                        print(f"     Col {col_idx}: '{val_str}'")
            print(f"   Collected {len(segment_values)} segment values")
    
    # Initialize processor and extract metadata
    processor = TelemetryProcessor()
    metadata, df_processed = processor._extract_metadata(df)
    
    print(f"\n📋 Extracted metadata ({len(metadata)} items):")
    for key, value in metadata.items():
        print(f"   {key}: {value}")
    
    # Debug beacon markers specifically
    print(f"\n🎯 Beacon Markers Debug:")
    beacon_str = metadata.get('Beacon Markers', '')
    print(f"   Raw beacon string: '{beacon_str}'")
    print(f"   String length: {len(beacon_str)}")
    print(f"   String type: {type(beacon_str)}")
    
    if beacon_str:
        try:
            markers = [float(x.strip()) for x in beacon_str.split(',') if x.strip()]
            print(f"   Parsed markers ({len(markers)}): {markers}")
        except Exception as e:
            print(f"   ❌ Failed to parse markers: {str(e)}")
    
    # Debug segment times
    print(f"\n⏱️ Segment Times Debug:")
    segment_str = metadata.get('Segment Times', '')
    print(f"   Raw segment string: '{segment_str}'")
    print(f"   String length: {len(segment_str)}")
    
    if segment_str:
        try:
            import re
            segments = []
            time_pattern = r'(\d{1,2}):(\d{2})\.(\d)'
            
            for segment in segment_str.split(','):
                segment = segment.strip()
                print(f"   Processing segment: '{segment}'")
                match = re.match(time_pattern, segment)
                if match:
                    minutes = int(match.group(1))
                    seconds = int(match.group(2))
                    tenths = int(match.group(3))
                    total_seconds = minutes * 60 + seconds + tenths / 10.0
                    segments.append(total_seconds)
                    print(f"      -> {total_seconds}s")
                else:
                    print(f"      -> No match for pattern")
            
            print(f"   Parsed segments ({len(segments)}): {segments}")
        except Exception as e:
            print(f"   ❌ Failed to parse segments: {str(e)}")
    
    print(f"\n📊 Processed DataFrame shape: {df_processed.shape}")
    print(f"📋 Processed DataFrame columns: {list(df_processed.columns[:10])}")  # Show first 10 only

def check_offset_mapping():
    """Check the offset between raw file lines and pandas DataFrame rows"""
    
    csv_path = "Abhay Mohan Round 3 Race 1 Telemetry.csv"
    
    print("\n🔍 Checking offset mapping between raw file and pandas...")
    
    # Read raw file lines
    with open(csv_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Read with pandas
    df = pd.read_csv(csv_path, dtype=str)
    
    print(f"📊 Raw file has {len(lines)} lines")
    print(f"📊 Pandas DataFrame has {len(df)} rows")
    
    print("\n🔄 Comparing first 15 items:")
    for i in range(min(15, len(lines), len(df))):
        raw_line = lines[i].strip()
        if raw_line:
            raw_first_field = raw_line.split(',')[0]
        else:
            raw_first_field = "(empty)"
        
        pandas_first_field = str(df.iloc[i, 0]) if i < len(df) else "(missing)"
        
        print(f"  {i:2d}: Raw='{raw_first_field:<20}' | Pandas='{pandas_first_field:<20}'")
        
        # Check for beacon markers specifically
        if 'Beacon Markers' in raw_line:
            print(f"      ⭐ Raw line {i} contains Beacon Markers")
        if 'Beacon Markers' in pandas_first_field:
            print(f"      ⭐ Pandas row {i} contains Beacon Markers")

def check_raw_csv_structure():
    """Check the raw structure of the CSV file"""
    
    csv_path = "Abhay Mohan Round 3 Race 1 Telemetry.csv"
    
    print("\n🔍 Checking raw CSV structure...")
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        print(f"📊 Total lines in file: {len(lines)}")
        
        print("\n📋 First 15 lines (raw):")
        for i, line in enumerate(lines[:15]):
            print(f"Line {i:2d}: {line.rstrip()}")
        
        # Look for beacon markers line specifically
        print("\n🎯 Searching for beacon markers line...")
        for i, line in enumerate(lines[:25]):
            if 'Beacon Markers' in line:
                print(f"Found at line {i}: {line.rstrip()}")
                break
        else:
            print("❌ Beacon Markers line not found in first 25 lines")
        
        # Look for segment times line
        print("\n⏱️ Searching for segment times line...")
        for i, line in enumerate(lines[:25]):
            if 'Segment Times' in line:
                print(f"Found at line {i}: {line.rstrip()}")
                break
        else:
            print("❌ Segment Times line not found in first 25 lines")
            
    except Exception as e:
        print(f"❌ Error reading raw file: {str(e)}")

def main():
    """Run debugging"""
    print("🐛 Starting Metadata Extraction Debug\n")
    
    check_raw_csv_structure()
    check_offset_mapping()
    debug_metadata_extraction()

if __name__ == "__main__":
    main() 