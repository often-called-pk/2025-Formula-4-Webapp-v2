import React, { useState, useEffect, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Card } from '../../../components/ui/card';
import chartSyncService from '../../../services/chartSyncService';
import gpsProcessingService from '../../../services/gpsProcessingService';

const TrackMap3D = ({ 
  lapDeltaData, 
  files = null, // Add files prop for GPS processing
  isLoading = false, 
  error = null,
  height = 400,
  onPositionChange = null,
  chartId = 'track-map-3d'
}) => {
  const [cursorPosition, setCursorPosition] = useState(null);
  const [cameraView, setCameraView] = useState('perspective');
  const [showDriverLines, setShowDriverLines] = useState({ driver1: true, driver2: true });
  const [colorMode, setColorMode] = useState('speed'); // 'speed', 'delta', 'sector'
  const [gpsData, setGpsData] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const plotRef = useRef(null);
  const isInternalUpdate = useRef(false);

  // Process GPS data from files when available
  useEffect(() => {
    const processGPSData = async () => {
      if (!files || files.length !== 2) {
        setGpsData(null);
        return;
      }

      setGpsLoading(true);
      setGpsError(null);

      try {
        const validation = gpsProcessingService.validateGPSFiles(files[0], files[1]);
        if (!validation.valid) {
          throw new Error(validation.errors.join(', '));
        }

        const processedData = await gpsProcessingService.extractGPSData(files[0], files[1]);
        setGpsData(processedData);
      } catch (error) {
        setGpsError(error.message);
        console.error('GPS processing error:', error);
      } finally {
        setGpsLoading(false);
      }
    };

    processGPSData();
  }, [files]);

  // Extract and process GPS data for 3D visualization
  const processedTrackData = useMemo(() => {
    // Use real GPS data if available, otherwise fall back to mock data
    if (gpsData) {
      return gpsData;
    }

    // Fallback mock data when no real GPS data is available
    if (!lapDeltaData?.drivers) {
      return null;
    }

    const mockTrackData = {
      driver1: {
        name: lapDeltaData.drivers.driver1.name,
        coordinates: {
          latitude: Array.from({length: 50}, (_, i) => 51.5074 + (i * 0.001) * Math.sin(i * 0.3)),
          longitude: Array.from({length: 50}, (_, i) => -0.1278 + (i * 0.001) * Math.cos(i * 0.3)),
          elevation: Array.from({length: 50}, (_, i) => 10 + 5 * Math.sin(i * 0.2)),
          distance: Array.from({length: 50}, (_, i) => i * 100),
          speed: Array.from({length: 50}, (_, i) => 120 + 30 * Math.sin(i * 0.4))
        }
      },
      driver2: {
        name: lapDeltaData.drivers.driver2.name,
        coordinates: {
          latitude: Array.from({length: 50}, (_, i) => 51.5074 + (i * 0.001) * Math.sin(i * 0.3 + 0.1)),
          longitude: Array.from({length: 50}, (_, i) => -0.1278 + (i * 0.001) * Math.cos(i * 0.3 + 0.1)),
          elevation: Array.from({length: 50}, (_, i) => 10 + 5 * Math.sin(i * 0.2 + 0.1)),
          distance: Array.from({length: 50}, (_, i) => i * 100),
          speed: Array.from({length: 50}, (_, i) => 118 + 32 * Math.sin(i * 0.4 + 0.15))
        }
      },
      trackInfo: {
        totalDistance: 5000,
        sectors: [
          { start: 0, end: 1667, color: '#EF4444' },
          { start: 1667, end: 3333, color: '#10B981' },
          { start: 3333, end: 5000, color: '#3B82F6' }
        ],
        corners: [
          { distance: 500, name: 'Turn 1', type: 'hairpin' },
          { distance: 1200, name: 'Turn 2', type: 'chicane' },
          { distance: 2800, name: 'Turn 3', type: 'sweeper' },
          { distance: 4200, name: 'Turn 4', type: 'tight' }
        ]
      }
    };

    return mockTrackData;
  }, [gpsData, lapDeltaData]);

  // Generate 3D chart traces for track visualization
  const chartTraces = useMemo(() => {
    if (!processedTrackData) {
      return [];
    }

    const traces = [];

    // Driver 1 racing line
    if (showDriverLines.driver1) {
      const driver1Data = processedTrackData.driver1;
      
      // Convert GPS coordinates to relative 3D coordinates
      // Use the first coordinate as reference point for relative positioning
      const refLat = driver1Data.coordinates.latitude[0];
      const refLon = driver1Data.coordinates.longitude[0];
      
      const x = driver1Data.coordinates.longitude.map(lon => (lon - refLon) * 111000 * Math.cos(refLat * Math.PI / 180));
      const y = driver1Data.coordinates.latitude.map(lat => (lat - refLat) * 111000);
      const z = driver1Data.coordinates.elevation;

      // Color by speed or other metric
      const dataLength = driver1Data.coordinates.speed.length;
      const colors = colorMode === 'speed' ? driver1Data.coordinates.speed : 
                    colorMode === 'delta' ? Array(dataLength).fill(0.5) : // Placeholder for delta
                    driver1Data.coordinates.distance.map(d => {
                      const totalDistance = processedTrackData.trackInfo?.totalDistance || Math.max(...driver1Data.coordinates.distance);
                      return Math.floor(d / (totalDistance / 3));
                    }); // Sector

      traces.push({
        x: x,
        y: y,
        z: z,
        type: 'scatter3d',
        mode: 'lines+markers',
        name: driver1Data.name,
        line: {
          color: colors,
          colorscale: colorMode === 'speed' ? 'Viridis' : 
                     colorMode === 'delta' ? 'RdYlGn' : 'Set1',
          width: 8,
          showscale: true,
          colorbar: {
            title: colorMode === 'speed' ? 'Speed (km/h)' : 
                   colorMode === 'delta' ? 'Time Delta (s)' : 'Sector',
            x: 1.1
          }
        },
        marker: {
          size: 4,
          color: colors,
          colorscale: colorMode === 'speed' ? 'Viridis' : 
                     colorMode === 'delta' ? 'RdYlGn' : 'Set1',
          showscale: false
        },
        hovertemplate: 
          '<b>' + driver1Data.name + '</b><br>' +
          'Distance: %{customdata.distance:.0f}m<br>' +
          'Speed: %{customdata.speed:.1f} km/h<br>' +
          'Elevation: %{z:.1f}m<br>' +
          '<extra></extra>',
        customdata: driver1Data.coordinates.distance.map((d, i) => ({
          distance: d,
          speed: driver1Data.coordinates.speed[i]
        }))
      });
    }

    // Driver 2 racing line
    if (showDriverLines.driver2) {
      const driver2Data = processedTrackData.driver2;
      
      // Use same reference point as driver 1 for consistency
      const refLat = processedTrackData.driver1.coordinates.latitude[0];
      const refLon = processedTrackData.driver1.coordinates.longitude[0];
      
      const x = driver2Data.coordinates.longitude.map(lon => (lon - refLon) * 111000 * Math.cos(refLat * Math.PI / 180));
      const y = driver2Data.coordinates.latitude.map(lat => (lat - refLat) * 111000);
      const z = driver2Data.coordinates.elevation;

      const dataLength = driver2Data.coordinates.speed.length;
      const colors = colorMode === 'speed' ? driver2Data.coordinates.speed : 
                    colorMode === 'delta' ? Array(dataLength).fill(-0.3) : // Placeholder for delta
                    driver2Data.coordinates.distance.map(d => {
                      const totalDistance = processedTrackData.trackInfo?.totalDistance || Math.max(...driver2Data.coordinates.distance);
                      return Math.floor(d / (totalDistance / 3));
                    }); // Sector

      traces.push({
        x: x,
        y: y,
        z: z,
        type: 'scatter3d',
        mode: 'lines+markers',
        name: driver2Data.name,
        line: {
          color: colors,
          colorscale: colorMode === 'speed' ? 'Plasma' : 
                     colorMode === 'delta' ? 'RdYlGn' : 'Set2',
          width: 6,
          opacity: 0.8
        },
        marker: {
          size: 3,
          color: colors,
          colorscale: colorMode === 'speed' ? 'Plasma' : 
                     colorMode === 'delta' ? 'RdYlGn' : 'Set2',
          opacity: 0.8
        },
        hovertemplate: 
          '<b>' + driver2Data.name + '</b><br>' +
          'Distance: %{customdata.distance:.0f}m<br>' +
          'Speed: %{customdata.speed:.1f} km/h<br>' +
          'Elevation: %{z:.1f}m<br>' +
          '<extra></extra>',
        customdata: driver2Data.coordinates.distance.map((d, i) => ({
          distance: d,
          speed: driver2Data.coordinates.speed[i]
        }))
      });
    }

    // Add cursor position marker if set
    if (cursorPosition !== null && processedTrackData.driver1) {
      // Find closest point to cursor position
      const distances = processedTrackData.driver1.coordinates.distance;
      const closestIndex = distances.reduce((prev, curr, index) => 
        Math.abs(curr - cursorPosition) < Math.abs(distances[prev] - cursorPosition) ? index : prev, 0
      );

      const driver1Data = processedTrackData.driver1;
      const refLat = driver1Data.coordinates.latitude[0];
      const refLon = driver1Data.coordinates.longitude[0];
      
      const x = (driver1Data.coordinates.longitude[closestIndex] - refLon) * 111000 * Math.cos(refLat * Math.PI / 180);
      const y = (driver1Data.coordinates.latitude[closestIndex] - refLat) * 111000;
      const z = driver1Data.coordinates.elevation[closestIndex];

      traces.push({
        x: [x],
        y: [y],
        z: [z + 5], // Slightly elevated
        type: 'scatter3d',
        mode: 'markers',
        name: 'Current Position',
        marker: {
          size: 12,
          color: '#8B5CF6',
          symbol: 'diamond',
          opacity: 0.9
        },
        showlegend: false,
        hovertemplate: 
          '<b>Current Position</b><br>' +
          'Distance: ' + cursorPosition.toFixed(0) + 'm<br>' +
          '<extra></extra>'
      });
    }

    return traces;
  }, [processedTrackData, showDriverLines, colorMode, cursorPosition]);

  // 3D scene layout configuration
  const layout = useMemo(() => ({
    title: {
      text: '3D Track Map',
      font: { 
        size: 18, 
        color: 'hsl(var(--foreground))',
        family: 'Inter, sans-serif'
      },
      x: 0.05
    },
    scene: {
      aspectmode: 'manual',
      aspectratio: { x: 2, y: 2, z: 0.5 },
      camera: {
        eye: cameraView === 'overhead' ? 
          { x: 0, y: 0, z: 2.5 } : 
          { x: 1.5, y: 1.5, z: 1.2 },
        projection: { type: 'perspective' }
      },
      xaxis: {
        title: 'Longitude (m)',
        showgrid: true,
        gridcolor: 'rgba(107, 114, 128, 0.3)',
        backgroundcolor: 'transparent',
        color: 'hsl(var(--foreground))'
      },
      yaxis: {
        title: 'Latitude (m)',
        showgrid: true,
        gridcolor: 'rgba(107, 114, 128, 0.3)',
        backgroundcolor: 'transparent',
        color: 'hsl(var(--foreground))'
      },
      zaxis: {
        title: 'Elevation (m)',
        showgrid: true,
        gridcolor: 'rgba(107, 114, 128, 0.3)',
        backgroundcolor: 'transparent',
        color: 'hsl(var(--foreground))'
      },
      bgcolor: 'transparent',
      dragmode: 'orbit'
    },
    plot_bgcolor: 'transparent',
    paper_bgcolor: 'transparent',
    font: { 
      color: 'hsl(var(--foreground))',
      family: 'Inter, sans-serif'
    },
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(0,0,0,0.8)',
      bordercolor: 'hsl(var(--border))',
      borderwidth: 1,
      font: { color: 'hsl(var(--foreground))' }
    },
    margin: { l: 0, r: 0, t: 60, b: 0 },
    height
  }), [height, cameraView]);

  // Chart synchronization setup
  useEffect(() => {
    const unsubscribe = chartSyncService.subscribe(chartId, {
      onCursorMove: (position) => {
        if (!isInternalUpdate.current) {
          setCursorPosition(position);
          if (onPositionChange) {
            onPositionChange(position);
          }
        }
      },
      onReset: () => {
        if (!isInternalUpdate.current) {
          setCursorPosition(null);
        }
      }
    });

    return unsubscribe;
  }, [chartId, onPositionChange]);

  // Chart configuration
  const config = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
    displaylogo: false,
    responsive: true
  };

  // Handle hover events
  const handleHover = (data) => {
    if (data?.points?.[0]?.customdata?.distance !== undefined) {
      const position = data.points[0].customdata.distance;
      
      if (!isInternalUpdate.current) {
        isInternalUpdate.current = true;
        setCursorPosition(position);
        chartSyncService.debouncedCursorBroadcast(chartId, position, {
          chartType: 'track-map-3d',
          distance: position
        });
        
        if (onPositionChange) {
          onPositionChange(position);
        }
        
        setTimeout(() => {
          isInternalUpdate.current = false;
        }, 50);
      }
    }
  };

  // Loading state
  if (isLoading || gpsLoading) {
    return (
      <Card className="p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">
            {gpsLoading ? 'Processing GPS data...' : 'Loading 3D track data...'}
          </span>
        </div>
      </Card>
    );
  }

  // Error state
  if (error || gpsError) {
    return (
      <Card className="p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading track data</p>
            <p className="text-muted-foreground text-sm">{error || gpsError}</p>
            {gpsError && (
              <p className="text-muted-foreground text-xs mt-2">
                Using fallback data for visualization
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // No data state
  if (!processedTrackData) {
    return (
      <Card className="p-6">
        <div className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">No GPS track data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <h3 className="text-lg font-semibold">3D Track Map</h3>
        
        {/* Camera View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setCameraView('perspective')}
            className={`px-3 py-1 text-xs rounded ${
              cameraView === 'perspective' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            3D View
          </button>
          <button
            onClick={() => setCameraView('overhead')}
            className={`px-3 py-1 text-xs rounded ${
              cameraView === 'overhead' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Overhead
          </button>
        </div>

        {/* Color Mode Toggle */}
        <div className="flex gap-2">
          {['speed', 'delta', 'sector'].map((mode) => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`px-3 py-1 text-xs rounded capitalize ${
                colorMode === mode 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Driver Line Toggles */}
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={showDriverLines.driver1}
              onChange={(e) => setShowDriverLines(prev => ({ ...prev, driver1: e.target.checked }))}
              className="rounded"
            />
            {processedTrackData.driver1.name}
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={showDriverLines.driver2}
              onChange={(e) => setShowDriverLines(prev => ({ ...prev, driver2: e.target.checked }))}
              className="rounded"
            />
            {processedTrackData.driver2.name}
          </label>
        </div>
      </div>
      
      {/* 3D Plot */}
      <Plot
        ref={plotRef}
        data={chartTraces}
        layout={layout}
        config={config}
        onHover={handleHover}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Track Info */}
      {processedTrackData?.trackInfo && (
        <div className="mt-4 text-sm text-muted-foreground">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="font-medium">Track Distance</p>
              <p>{processedTrackData.trackInfo.totalDistance}m</p>
            </div>
            <div>
              <p className="font-medium">Sectors</p>
              <p>{processedTrackData.trackInfo.sectors?.length || 0}</p>
            </div>
            <div>
              <p className="font-medium">Corners</p>
              <p>{processedTrackData.trackInfo.corners?.length || 0}</p>
            </div>
            <div>
              <p className="font-medium">Data Source</p>
              <p>{gpsData ? 'Real GPS' : 'Mock Data'}</p>
            </div>
          </div>
          
          {/* GPS Processing Info */}
          {gpsData && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="font-medium">{gpsData.driver1.name}</p>
                  <p>{gpsData.driver1.processedDataPoints} points</p>
                </div>
                <div>
                  <p className="font-medium">{gpsData.driver2.name}</p>
                  <p>{gpsData.driver2.processedDataPoints} points</p>
                </div>
                <div>
                  <p className="font-medium">Elevation Range</p>
                  <p>{gpsData.driver1.metadata?.elevationRange?.delta?.toFixed(1) || 0}m</p>
                </div>
                <div>
                  <p className="font-medium">Lap Time</p>
                  <p>{gpsData.driver1.metadata?.fastestLapTime?.toFixed(2) || 0}s</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TrackMap3D;