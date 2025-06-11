import pandas as pd
import sys
import os
sys.path.append('services')
sys.path.append('models')
from services.data_processor import TelemetryProcessor

def test_real_data_alignment():
    """Test the alignment engine with real CSV files"""
    processor = TelemetryProcessor()

    try:
        # Load the two CSV files
        df1 = pd.read_csv('../Abhay Mohan Round 3 Race 1 Telemetry.csv')
        df2 = pd.read_csv('../Aqil Alibhai Round 3 Race 1 Telemetry.csv')
        
        print('CSV files loaded successfully')
        print(f'Abhay file: {len(df1)} rows, {len(df1.columns)} columns')
        print(f'Aqil file: {len(df2)} rows, {len(df2.columns)} columns')
        
        # Process both files to get session data
        sessions = []
        for df, driver in [(df1, 'Abhay Mohan'), (df2, 'Aqil Alibhai')]:
            metadata, df_clean = processor._extract_metadata(df)
            df_clean = processor.data_cleaner.clean_data(df_clean)
            laps = processor.lap_detector.detect_laps_from_metadata(metadata, df_clean)
            fastest_lap = processor.lap_detector.get_fastest_lap(laps)
            
            from models.telemetry_models import SessionData
            session_data = SessionData(
                driver_name=metadata.get('Racer', driver),
                session_name=metadata.get('Session', 'Round 3 Race 1'),
                track_name=metadata.get('Session', 'Unknown Track'),
                laps=laps,
                fastest_lap=fastest_lap,
                metadata=metadata
            )
            sessions.append(session_data)
            
            if fastest_lap:
                print(f'{driver}: {len(laps)} laps detected, fastest lap: {fastest_lap.lap_time:.3f}s')
            else:
                print(f'{driver}: {len(laps)} laps detected, no fastest lap')
        
        # Test alignment
        if len(sessions) == 2 and sessions[0].fastest_lap and sessions[1].fastest_lap:
            print('\nTesting data alignment...')
            result = processor.compare_sessions_detailed(sessions[0], sessions[1])
            
            if result['success']:
                print('✅ Data alignment successful!')
                print(f'Data points aligned: {result["alignment_info"]["data_points"]}')
                print(f'Total distance: {result["alignment_info"]["total_distance"]:.1f}m')
                print(f'Speed comparison available: {"speed_comparison" in result["comparison_metrics"]}')
                print(f'Sector analysis available: {len(result["sector_analysis"])} sectors')
                print(f'Cornering analysis available: {"cornering_zones" in result["cornering_analysis"]}')
                
                # Test lap comparison data for visualization
                print('\nTesting lap comparison data for visualization...')
                viz_result = processor.get_lap_comparison_data(sessions[0], sessions[1])
                if viz_result['success']:
                    print('✅ Lap comparison data generation successful!')
                    print(f'Distance points: {len(viz_result["distance"])}')
                    print(f'Available channels: {list(viz_result["channels"].keys())}')
                else:
                    print(f'❌ Lap comparison data failed: {viz_result["error"]}')
            else:
                print(f'❌ Alignment failed: {result["error"]}')
        else:
            print('Not enough data for alignment test')

    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_real_data_alignment() 