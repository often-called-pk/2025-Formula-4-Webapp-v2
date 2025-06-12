import React, { useState, useEffect, useMemo, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Card } from '../../../components/ui/card';
import chartSyncService from '../../../services/chartSyncService';

const LapDeltaChart = ({ 
  lapDeltaData, 
  isLoading = false, 
  error = null,
  height = 400,
  onCursorChange = null,
  chartId = 'lap-delta-chart'
}) => {
  const [cursorPosition, setCursorPosition] = useState(null);
  const [zoomState, setZoomState] = useState(null);
  const plotRef = useRef(null);
  const isInternalUpdate = useRef(false);

  // Performance optimization: Data decimation for large datasets
  const optimizedData = useMemo(() => {
    if (!lapDeltaData?.lap_delta) {
      return null;
    }

    const delta = lapDeltaData.lap_delta;
    let distances = delta.distance_array || [];
    let cumulativeDelta = delta.cumulative_delta_array || [];
    
    if (distances.length === 0 || cumulativeDelta.length === 0) {
      return null;
    }

    // Data decimation for performance (target: ~1000 points for smooth rendering)
    const maxPoints = 1000;
    if (distances.length > maxPoints) {
      const step = Math.ceil(distances.length / maxPoints);
      distances = distances.filter((_, index) => index % step === 0);
      cumulativeDelta = cumulativeDelta.filter((_, index) => index % step === 0);
    }

    return { distances, cumulativeDelta, originalLength: delta.distance_array?.length || 0 };
  }, [lapDeltaData]);

  // Prepare chart data from optimized delta analysis
  const chartData = useMemo(() => {
    if (!optimizedData) {
      return null;
    }

    const { distances, cumulativeDelta } = optimizedData;
    const delta = lapDeltaData.lap_delta;

    // Create color-coded delta segments
    const deltaColors = cumulativeDelta.map(delta => {
      if (delta > 0) return '#EF4444'; // Red for positive delta (Driver 1 ahead)
      if (delta < 0) return '#10B981'; // Green for negative delta (Driver 2 ahead)
      return '#6B7280'; // Gray for zero
    });

    // Create main delta trace with color-coded segments
    const deltaTrace = {
      x: distances,
      y: cumulativeDelta,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Lap Delta',
      line: {
        color: deltaColors,
        width: 3,
        shape: 'linear'
      },
      marker: {
        color: deltaColors,
        size: 3,
        opacity: 0.8
      },
      customdata: cumulativeDelta.map((delta, i) => ({
        leader: delta > 0 ? 
          (lapDeltaData.drivers?.driver1?.name || 'Driver 1') : 
          (lapDeltaData.drivers?.driver2?.name || 'Driver 2'),
        gap: Math.abs(delta).toFixed(3),
        advantage: delta > 0 ? 'ahead' : 'behind'
      })),
      hovertemplate: 
        '<b>Distance:</b> %{x:.0f}m<br>' +
        '<b>Time Delta:</b> %{y:.3f}s<br>' +
        '<b>Leader:</b> %{customdata.leader}<br>' +
        '<b>Gap:</b> %{customdata.gap}s %{customdata.advantage}<br>' +
        '<extra></extra>'
    };

    // Enhanced zero reference line with racing styling
    const zeroLine = {
      x: [distances[0], distances[distances.length - 1]],
      y: [0, 0],
      type: 'scatter',
      mode: 'lines',
      name: 'Equal Time',
      line: {
        color: '#FBBF24', // Racing yellow for prominence
        width: 2,
        dash: 'dot'
      },
      showlegend: true,
      hovertemplate: '<b>Equal Time Line</b><br>No advantage to either driver<extra></extra>'
    };

    // Add zero crossing markers
    const zeroCrossings = delta.zero_crossings || [];
    const crossingTrace = zeroCrossings.length > 0 ? {
      x: zeroCrossings.map(crossing => crossing.distance),
      y: zeroCrossings.map(() => 0),
      type: 'scatter',
      mode: 'markers',
      name: 'Equal Points',
      marker: {
        color: '#10B981',
        size: 8,
        symbol: 'circle'
      },
      hovertemplate: 
        '<b>Equal at:</b> %{x:.0f}m<br>' +
        '<b>Drivers equal</b><br>' +
        '<extra></extra>'
    } : null;

    // Add maximum advantage markers
    const maxAdvantages = delta.max_advantages || {};
    const advantageTraces = [];

    if (maxAdvantages.driver1_max_advantage) {
      const adv = maxAdvantages.driver1_max_advantage;
      advantageTraces.push({
        x: [adv.distance],
        y: [adv.time_gap],
        type: 'scatter',
        mode: 'markers',
        name: `${lapDeltaData.drivers?.driver1?.name || 'Driver 1'} Max Advantage`,
        marker: {
          color: '#EF4444',
          size: 10,
          symbol: 'triangle-up'
        },
        hovertemplate: 
          '<b>Max Advantage:</b> %{y:.3f}s<br>' +
          '<b>At Distance:</b> %{x:.0f}m<br>' +
          '<extra></extra>'
      });
    }

    if (maxAdvantages.driver2_max_advantage) {
      const adv = maxAdvantages.driver2_max_advantage;
      advantageTraces.push({
        x: [adv.distance],
        y: [-adv.time_gap], // Negative because driver2 advantage shows as negative delta
        type: 'scatter',
        mode: 'markers',
        name: `${lapDeltaData.drivers?.driver2?.name || 'Driver 2'} Max Advantage`,
        marker: {
          color: '#F59E0B',
          size: 10,
          symbol: 'triangle-down'
        },
        hovertemplate: 
          '<b>Max Advantage:</b> %{y:.3f}s<br>' +
          '<b>At Distance:</b> %{x:.0f}m<br>' +
          '<extra></extra>'
      });
    }

    // Create gradient fill areas based on delta magnitude
    const positiveAreaTrace = {
      x: distances,
      y: cumulativeDelta.map(delta => Math.max(0, delta)),
      fill: 'tozeroy',
      type: 'scatter',
      mode: 'none',
      name: 'Driver 1 Advantage',
      fillcolor: 'rgba(239, 68, 68, 0.3)', // Red with transparency
      showlegend: false,
      hoverinfo: 'skip'
    };

    const negativeAreaTrace = {
      x: distances,
      y: cumulativeDelta.map(delta => Math.min(0, delta)),
      fill: 'tozeroy',
      type: 'scatter',
      mode: 'none',
      name: 'Driver 2 Advantage',
      fillcolor: 'rgba(16, 185, 129, 0.3)', // Green with transparency
      showlegend: false,
      hoverinfo: 'skip'
    };

    // Create automatic annotations for significant changes
    const significantChanges = delta.significant_changes || [];
    const annotations = significantChanges
      .filter(change => change.change >= 1.0) // Only show changes >= 1 second
      .slice(0, 5) // Limit to 5 annotations to avoid clutter
      .map(change => ({
        x: change.distance,
        y: change.delta,
        text: `${change.type === 'gain' ? '↗' : '↘'} ${change.change.toFixed(2)}s`,
        showarrow: true,
        arrowhead: 2,
        arrowsize: 1,
        arrowwidth: 2,
        arrowcolor: change.type === 'gain' ? '#EF4444' : '#10B981',
        font: {
          size: 10,
          color: 'hsl(var(--foreground))',
          family: 'Inter, sans-serif'
        },
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        bordercolor: change.type === 'gain' ? '#EF4444' : '#10B981',
        borderwidth: 1
      }));

    // Add vertical cursor line if position is set
    const cursorLine = cursorPosition !== null ? {
      x: [cursorPosition, cursorPosition],
      y: [Math.min(...cumulativeDelta) - 0.1, Math.max(...cumulativeDelta) + 0.1],
      type: 'scatter',
      mode: 'lines',
      name: 'Cursor',
      line: {
        color: '#8B5CF6',
        width: 2,
        dash: 'dot'
      },
      showlegend: false,
      hoverinfo: 'skip'
    } : null;

    return {
      traces: [positiveAreaTrace, negativeAreaTrace, deltaTrace, zeroLine, crossingTrace, ...advantageTraces, cursorLine].filter(Boolean),
      distances,
      cumulativeDelta,
      annotations
    };
  }, [optimizedData, cursorPosition, lapDeltaData]);

  // Enhanced chart layout with racing styling and annotations
  const layout = useMemo(() => ({
    annotations: chartData?.annotations || [],
    title: {
      text: 'Lap Delta Analysis - Time Gained/Lost',
      font: { 
        size: 18, 
        color: 'hsl(var(--foreground))',
        family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      },
      x: 0.05
    },
    xaxis: {
      title: {
        text: 'Track Distance (meters)',
        font: { 
          color: 'hsl(var(--foreground))',
          size: 14,
          family: 'Inter, sans-serif'
        }
      },
      color: 'hsl(var(--foreground))',
      gridcolor: 'rgba(107, 114, 128, 0.3)',
      zerolinecolor: 'rgba(107, 114, 128, 0.5)',
      showgrid: true,
      gridwidth: 1,
      tickfont: { size: 12 },
      dtick: 500 // Distance markers every 500m
    },
    yaxis: {
      title: {
        text: 'Time Delta (seconds)',
        font: { 
          color: 'hsl(var(--foreground))',
          size: 14,
          family: 'Inter, sans-serif'
        }
      },
      color: 'hsl(var(--foreground))',
      gridcolor: 'rgba(107, 114, 128, 0.3)',
      zerolinecolor: '#FBBF24', // Racing yellow for zero line prominence
      zerolinewidth: 3,
      showgrid: true,
      gridwidth: 1,
      tickfont: { size: 12 },
      tickformat: '.3f' // Show 3 decimal places for precision
    },
    plot_bgcolor: 'transparent',
    paper_bgcolor: 'transparent',
    font: { 
      color: 'hsl(var(--foreground))' 
    },
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: 'rgba(0,0,0,0)',
      font: { color: 'hsl(var(--foreground))' }
    },
    margin: { l: 60, r: 40, t: 60, b: 60 },
    height,
    hovermode: 'x unified',
    showlegend: true
  }), [height, chartData]);

  // Responsive design with debounced resize handling
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (plotRef.current) {
          window.Plotly.Plots.resize(plotRef.current);
        }
      }, 250); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Chart synchronization setup
  useEffect(() => {
    const unsubscribe = chartSyncService.subscribe(chartId, {
      onZoom: (zoomData) => {
        if (!isInternalUpdate.current && plotRef.current) {
          isInternalUpdate.current = true;
          setZoomState(zoomData);
          // Apply zoom to plot
          const update = {
            'xaxis.range': zoomData.xRange,
            'yaxis.range': zoomData.yRange
          };
          window.Plotly.relayout(plotRef.current, update).finally(() => {
            isInternalUpdate.current = false;
          });
        }
      },
      onCursorMove: (position, dataPoint) => {
        if (!isInternalUpdate.current) {
          setCursorPosition(position);
          if (onCursorChange) {
            onCursorChange(position);
          }
        }
      },
      onReset: () => {
        if (!isInternalUpdate.current && plotRef.current) {
          setCursorPosition(null);
          setZoomState(null);
          window.Plotly.relayout(plotRef.current, {
            'xaxis.autorange': true,
            'yaxis.autorange': true
          });
        }
      }
    });

    return unsubscribe;
  }, [chartId, onCursorChange]);

  // Chart configuration with enhanced interactivity
  const config = {
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
    displaylogo: false,
    responsive: true,
    doubleClick: 'reset'
  };

  // Enhanced hover handler with synchronization
  const handleHover = (data) => {
    if (data?.points?.[0]?.x !== undefined) {
      const newPosition = data.points[0].x;
      const dataPoint = {
        distance: newPosition,
        delta: data.points[0].y,
        chartType: 'lap-delta'
      };

      if (!isInternalUpdate.current) {
        isInternalUpdate.current = true;
        setCursorPosition(newPosition);
        chartSyncService.debouncedCursorBroadcast(chartId, newPosition, dataPoint);
        
        if (onCursorChange) {
          onCursorChange(newPosition);
        }
        
        setTimeout(() => {
          isInternalUpdate.current = false;
        }, 50);
      }
    }
  };

  // Handle zoom events
  const handleRelayout = (eventData) => {
    if (!isInternalUpdate.current && eventData['xaxis.range[0]'] !== undefined) {
      const zoomData = {
        xRange: [eventData['xaxis.range[0]'], eventData['xaxis.range[1]']],
        yRange: eventData['yaxis.range[0]'] !== undefined ? 
          [eventData['yaxis.range[0]'], eventData['yaxis.range[1]']] : null,
        zoomLevel: 1 // Calculate based on range if needed
      };

      setZoomState(zoomData);
      chartSyncService.broadcastZoom(chartId, zoomData);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Calculating lap delta...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading lap delta data</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  // No data state
  if (!chartData) {
    return (
      <Card className="p-6">
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">No lap delta data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Lap Delta Analysis</h3>
        {lapDeltaData?.drivers && (
          <div className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-blue-600">
              {lapDeltaData.drivers.driver1.name}
            </span>
            {' vs '}
            <span className="font-medium text-orange-600">
              {lapDeltaData.drivers.driver2.name}
            </span>
            {lapDeltaData.lap_delta?.cumulative_delta_final && (
              <span className="ml-3">
                Final Gap: {lapDeltaData.lap_delta.cumulative_delta_final > 0 ? '+' : ''}
                {lapDeltaData.lap_delta.cumulative_delta_final.toFixed(3)}s
              </span>
            )}
          </div>
        )}
      </div>
      
      <Plot
        ref={plotRef}
        data={chartData.traces}
        layout={layout}
        config={config}
        onHover={handleHover}
        onRelayout={handleRelayout}
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Statistics Panel */}
      {lapDeltaData?.lap_delta?.statistics && (
        <div className="mt-4 space-y-4">
          {/* Enhanced Performance Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-red-500">
                {lapDeltaData.lap_delta.statistics.driver1_ahead_percentage.toFixed(1)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {lapDeltaData.drivers?.driver1?.name || 'Driver 1'} Ahead
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-green-500">
                {lapDeltaData.lap_delta.statistics.driver2_ahead_percentage.toFixed(1)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {lapDeltaData.drivers?.driver2?.name || 'Driver 2'} Ahead
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-yellow-500">
                {lapDeltaData.lap_delta.max_time_gap.toFixed(3)}s
              </div>
              <div className="text-muted-foreground text-xs">Max Gap</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-500">
                {lapDeltaData.lap_delta.avg_time_delta?.toFixed(3) || '0.000'}s
              </div>
              <div className="text-muted-foreground text-xs">Avg Delta</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-purple-500">
                {lapDeltaData.lap_delta.zero_crossings?.length || 0}
              </div>
              <div className="text-muted-foreground text-xs">Equal Points</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-500">
                {lapDeltaData.summary?.significantChanges || 0}
              </div>
              <div className="text-muted-foreground text-xs">Big Changes</div>
            </div>
          </div>

          {/* Data Quality Indicators */}
          {lapDeltaData.lap_delta?.data_quality && (
            <div className="p-3 bg-muted/50 rounded-md">
              <h4 className="font-medium text-sm mb-2">Data Quality</h4>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="font-medium">
                    {lapDeltaData.lap_delta.data_quality.valid_points_percentage.toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground">Valid Points</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">
                    {lapDeltaData.lap_delta.data_quality.total_points}
                  </div>
                  <div className="text-muted-foreground">Total Points</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">
                    {lapDeltaData.lap_delta.data_quality.interpolated_points || 0}
                  </div>
                  <div className="text-muted-foreground">Interpolated</div>
                </div>
              </div>
              {optimizedData?.originalLength > 1000 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Performance optimized: {optimizedData.originalLength} points → {optimizedData.distances?.length} points
                </div>
              )}
            </div>
          )}
          
          {/* Sector Analysis */}
          {lapDeltaData.lap_delta.sector_analysis && lapDeltaData.lap_delta.sector_analysis.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Sector Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                {lapDeltaData.lap_delta.sector_analysis.map((sector, index) => (
                  <div key={index} className="p-3 border border-border rounded-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">Sector {sector.sector}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        sector.advantage === 'driver1' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {sector.advantage === 'driver1' ? 
                          lapDeltaData.drivers?.driver1?.name || 'Driver 1' : 
                          lapDeltaData.drivers?.driver2?.name || 'Driver 2'}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {sector.start_distance.toFixed(0)}m - {sector.end_distance.toFixed(0)}m
                    </div>
                    <div className="font-medium">
                      {sector.time_gained_driver1 > 0 ? '+' : ''}{sector.time_gained_driver1.toFixed(3)}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Cursor Position Info */}
          {cursorPosition !== null && (
            <div className="p-3 bg-muted rounded-md">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Cursor Position:</span>
                <span>{cursorPosition.toFixed(0)}m</span>
              </div>
              {/* Interpolate delta value at cursor position */}
              {chartData && chartData.distances && (
                <div className="text-xs text-muted-foreground mt-1">
                  Time delta at this point: {(() => {
                    const distances = chartData.distances;
                    const deltas = chartData.cumulativeDelta;
                    const index = distances.findIndex(d => d >= cursorPosition);
                    if (index >= 0 && index < deltas.length) {
                      return `${deltas[index] > 0 ? '+' : ''}${deltas[index].toFixed(3)}s`;
                    }
                    return 'N/A';
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default LapDeltaChart;