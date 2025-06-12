import React, { useMemo, useState } from 'react';
import BaseChart from './BaseChart';
import { useChart } from './ChartContext';
import { 
  processComparisonData, 
  createSectorMarkers, 
  createHoverTemplate,
  detectTrackFeatures,
  calculatePerformanceStats 
} from '../../utils/chartUtils';

const SpeedDistanceChart = ({
  comparisonData,
  showSectors = true,
  showTrackFeatures = true,
  showStatistics = false,
  height = 500,
  title = 'Speed vs Distance Comparison',
  loading = false,
  error = null,
  onDataPointClick = null,
  className = '',
  ...props
}) => {
  const { colors, getDriverLineStyle, chartUtils } = useChart();
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Process the comparison data
  const processedData = useMemo(() => {
    return processComparisonData(comparisonData);
  }, [comparisonData]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (!processedData) return [];

    const { distance, driver1, driver2 } = processedData;
    const data = [];

    // Driver 1 speed line
    data.push({
      x: distance,
      y: driver1.speed,
      type: 'scatter',
      mode: 'lines',
      name: driver1.name,
      ...getDriverLineStyle(0),
      hovertemplate: createHoverTemplate('speed', driver1.name),
      customdata: distance.map((d, i) => ({
        distance: d,
        speed: driver1.speed[i],
        throttle: driver1.throttle[i],
        brake: driver1.brake[i]
      }))
    });

    // Driver 2 speed line
    data.push({
      x: distance,
      y: driver2.speed,
      type: 'scatter',
      mode: 'lines',
      name: driver2.name,
      ...getDriverLineStyle(1),
      hovertemplate: createHoverTemplate('speed', driver2.name),
      customdata: distance.map((d, i) => ({
        distance: d,
        speed: driver2.speed[i],
        throttle: driver2.throttle[i],
        brake: driver2.brake[i]
      }))
    });

    // Add sector markers if enabled
    if (showSectors && distance.length > 0) {
      const totalDistance = Math.max(...distance);
      const sectorMarkers = createSectorMarkers(totalDistance, 3, colors);
      
      // Scale sector markers to speed range
      const allSpeeds = [...driver1.speed, ...driver2.speed].filter(s => s > 0);
      const speedRange = {
        min: Math.min(...allSpeeds) * 0.95,
        max: Math.max(...allSpeeds) * 1.05
      };

      sectorMarkers.forEach(marker => {
        marker.y = [speedRange.min, speedRange.max];
        data.push(marker);
      });
    }

    // Add track features if enabled
    if (showTrackFeatures && distance.length > 0) {
      const features = detectTrackFeatures(driver1.speed, distance);
      
      // Add corner annotations
      features.corners.forEach((corner, index) => {
        data.push({
          type: 'scatter',
          x: [corner.start, corner.end],
          y: [corner.minSpeed, corner.minSpeed],
          mode: 'lines',
          line: {
            color: colors.warning,
            width: 8,
            opacity: 0.3
          },
          showlegend: index === 0,
          name: 'Corners',
          hovertemplate: `Corner<br>Distance: ${corner.start.toFixed(0)}m - ${corner.end.toFixed(0)}m<br>Min Speed: ${corner.minSpeed.toFixed(1)} km/h<extra></extra>`
        });
      });

      // Add straight annotations
      features.straights.forEach((straight, index) => {
        data.push({
          type: 'scatter',
          x: [straight.start, straight.end],
          y: [straight.maxSpeed, straight.maxSpeed],
          mode: 'lines',
          line: {
            color: colors.success,
            width: 8,
            opacity: 0.3
          },
          showlegend: index === 0,
          name: 'Straights',
          hovertemplate: `Straight<br>Distance: ${straight.start.toFixed(0)}m - ${straight.end.toFixed(0)}m<br>Max Speed: ${straight.maxSpeed.toFixed(1)} km/h<extra></extra>`
        });
      });
    }

    return data;
  }, [processedData, showSectors, showTrackFeatures, colors, getDriverLineStyle]);

  // Generate layout configuration
  const layout = useMemo(() => {
    if (!processedData) return {};

    const { distance, driver1, driver2 } = processedData;
    const allSpeeds = [...driver1.speed, ...driver2.speed].filter(s => s > 0);
    
    if (allSpeeds.length === 0) return {};

    const speedRange = {
      min: Math.min(...allSpeeds) * 0.95,
      max: Math.max(...allSpeeds) * 1.05
    };

    const distanceRange = {
      min: 0,
      max: Math.max(...distance) * 1.02
    };

    return {
      xaxis: {
        title: 'Distance (m)',
        range: [distanceRange.min, distanceRange.max],
        tickformat: ',.0f',
        showgrid: true,
        gridwidth: 1,
        dtick: Math.max(100, Math.round(distanceRange.max / 10 / 100) * 100)
      },
      yaxis: {
        title: 'Speed (km/h)',
        range: [speedRange.min, speedRange.max],
        tickformat: '.0f',
        showgrid: true,
        gridwidth: 1,
        dtick: 20
      },
      hovermode: 'x unified',
      dragmode: 'zoom'
    };
  }, [processedData]);

  // Calculate statistics if requested
  const statistics = useMemo(() => {
    if (!showStatistics || !processedData) return null;

    const { driver1, driver2 } = processedData;
    
    return {
      driver1: {
        name: driver1.name,
        stats: calculatePerformanceStats(driver1.speed)
      },
      driver2: {
        name: driver2.name,
        stats: calculatePerformanceStats(driver2.speed)
      }
    };
  }, [showStatistics, processedData]);

  // Handle chart events
  const handleChartClick = (eventData) => {
    if (onDataPointClick && eventData.points && eventData.points.length > 0) {
      const point = eventData.points[0];
      onDataPointClick({
        distance: point.x,
        speed: point.y,
        driverName: point.data.name,
        customData: point.customdata
      });
    }
  };

  // If no data, show appropriate message
  if (!processedData && !loading && !error) {
    return (
      <div className={`speed-distance-chart ${className}`}>
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">🏁</div>
            <div className="text-gray-600 dark:text-gray-400">
              No comparison data available
            </div>
            <div className="text-gray-500 dark:text-gray-500 text-sm mt-1">
              Upload telemetry files to compare driver speeds
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`speed-distance-chart ${className}`}>
      {/* Statistics Panel */}
      {showStatistics && statistics && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(statistics).map((driverStat, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {driverStat.name} - Speed Statistics
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Max:</span>
                  <span className="ml-2 font-mono">{driverStat.stats.max.toFixed(1)} km/h</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Min:</span>
                  <span className="ml-2 font-mono">{driverStat.stats.min.toFixed(1)} km/h</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                  <span className="ml-2 font-mono">{driverStat.stats.avg.toFixed(1)} km/h</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Std:</span>
                  <span className="ml-2 font-mono">{driverStat.stats.std.toFixed(1)} km/h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Chart */}
      <BaseChart
        data={chartData}
        layout={layout}
        title={title}
        loading={loading}
        error={error}
        onSelected={handleChartClick}
        style={{ height: `${height}px` }}
        {...props}
      />

      {/* Chart Controls */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500"></div>
          <span>{processedData?.driver1?.name || 'Driver 1'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span>{processedData?.driver2?.name || 'Driver 2'}</span>
        </div>
        {showTrackFeatures && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-amber-500 opacity-50"></div>
              <span>Corners</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500 opacity-50"></div>
              <span>Straights</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeedDistanceChart;