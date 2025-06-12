import React, { useMemo, useState } from 'react';
import BaseChart from './BaseChart';
import { useChart } from './ChartContext';
import { 
  processComparisonData, 
  createThresholdLines, 
  createHoverTemplate,
  calculatePerformanceStats 
} from '../../utils/chartUtils';

const EngineVitalsChart = ({
  comparisonData,
  showThresholds = true,
  showStatistics = false,
  channels = ['rpm', 'water_temp', 'oil_temp'],
  thresholds = {
    rpm: { redline: 7500, shift: 7000 },
    water_temp: { warning: 95, critical: 105 },
    oil_temp: { warning: 120, critical: 130 }
  },
  height = 500,
  title = 'Engine Vitals Comparison',
  loading = false,
  error = null,
  onDataPointClick = null,
  className = '',
  ...props
}) => {
  const { colors, getDriverLineStyle, chartUtils } = useChart();
  const [selectedChannel, setSelectedChannel] = useState('rpm');

  // Process the comparison data
  const processedData = useMemo(() => {
    return processComparisonData(comparisonData);
  }, [comparisonData]);

  // Channel configurations
  const channelConfigs = {
    rpm: {
      name: 'RPM',
      unit: 'RPM',
      yaxis: 'y',
      color: colors.primary,
      lineStyle: { width: 3 },
      range: [0, 8500],
      tickformat: ',.0f',
      dtick: 1000
    },
    water_temp: {
      name: 'Water Temperature',
      unit: '°C',
      yaxis: 'y2',
      color: colors.accent,
      lineStyle: { width: 2, dash: 'solid' },
      range: [70, 120],
      tickformat: '.0f',
      dtick: 10
    },
    oil_temp: {
      name: 'Oil Temperature',
      unit: '°C',
      yaxis: 'y3',
      color: colors.secondary,
      lineStyle: { width: 2, dash: 'dot' },
      range: [80, 140],
      tickformat: '.0f',
      dtick: 10
    },
    throttle: {
      name: 'Throttle Position',
      unit: '%',
      yaxis: 'y4',
      color: colors.success,
      lineStyle: { width: 2, dash: 'dashdot' },
      range: [0, 100],
      tickformat: '.0f',
      dtick: 20
    }
  };

  // Generate chart data
  const chartData = useMemo(() => {
    if (!processedData) return [];

    const { distance, driver1, driver2 } = processedData;
    const data = [];

    // Add data series for each enabled channel
    channels.forEach((channel, channelIndex) => {
      const config = channelConfigs[channel];
      if (!config) return;

      // Get channel data (handle different naming conventions)
      const getChannelData = (driverData, channelName) => {
        const variations = [
          channelName,
          channelName.replace('_', ''),
          channelName + '_pos',
          channelName.replace('_temp', 'Temp'),
          channelName.toUpperCase()
        ];
        
        for (const variation of variations) {
          if (driverData[variation]) {
            return driverData[variation];
          }
        }
        return [];
      };

      const driver1Data = getChannelData(driver1, channel);
      const driver2Data = getChannelData(driver2, channel);

      if (driver1Data.length === 0 && driver2Data.length === 0) return;

      // Driver 1 series
      if (driver1Data.length > 0) {
        data.push({
          x: distance,
          y: driver1Data,
          type: 'scatter',
          mode: 'lines',
          name: `${driver1.name} - ${config.name}`,
          yaxis: config.yaxis,
          line: {
            ...config.lineStyle,
            color: config.color
          },
          hovertemplate: `<b>${driver1.name}</b><br>${config.name}: %{y:.1f} ${config.unit}<br>Distance: %{x:.0f}m<extra></extra>`,
          customdata: distance.map((d, i) => ({
            distance: d,
            value: driver1Data[i],
            channel: config.name,
            unit: config.unit
          }))
        });
      }

      // Driver 2 series (slightly different color)
      if (driver2Data.length > 0) {
        data.push({
          x: distance,
          y: driver2Data,
          type: 'scatter',
          mode: 'lines',
          name: `${driver2.name} - ${config.name}`,
          yaxis: config.yaxis,
          line: {
            ...config.lineStyle,
            color: config.color,
            opacity: 0.7
          },
          hovertemplate: `<b>${driver2.name}</b><br>${config.name}: %{y:.1f} ${config.unit}<br>Distance: %{x:.0f}m<extra></extra>`,
          customdata: distance.map((d, i) => ({
            distance: d,
            value: driver2Data[i],
            channel: config.name,
            unit: config.unit
          }))
        });
      }
    });

    // Add threshold lines if enabled
    if (showThresholds && distance.length > 0) {
      const distanceRange = [0, Math.max(...distance)];
      
      channels.forEach(channel => {
        const config = channelConfigs[channel];
        const channelThresholds = thresholds[channel];
        
        if (!config || !channelThresholds) return;

        Object.entries(channelThresholds).forEach(([thresholdName, value]) => {
          const thresholdColor = thresholdName.includes('critical') ? colors.error :
                                 thresholdName.includes('warning') ? colors.warning :
                                 thresholdName.includes('redline') ? colors.error :
                                 colors.textSecondary;

          data.push({
            type: 'scatter',
            x: distanceRange,
            y: [value, value],
            mode: 'lines',
            yaxis: config.yaxis,
            line: {
              color: thresholdColor,
              width: 2,
              dash: 'dot'
            },
            name: `${config.name} ${thresholdName}`,
            showlegend: true,
            hovertemplate: `${config.name} ${thresholdName}: ${value} ${config.unit}<extra></extra>`
          });
        });
      });
    }

    return data;
  }, [processedData, channels, channelConfigs, showThresholds, thresholds, colors]);

  // Generate layout configuration with multiple y-axes
  const layout = useMemo(() => {
    if (!processedData) return {};

    const { distance } = processedData;
    
    if (distance.length === 0) return {};

    const distanceRange = [0, Math.max(...distance) * 1.02];

    // Base layout
    const layoutConfig = {
      xaxis: {
        title: 'Distance (m)',
        range: distanceRange,
        tickformat: ',.0f',
        showgrid: true,
        gridwidth: 1,
        domain: [0, 1]
      },
      hovermode: 'x unified',
      dragmode: 'zoom'
    };

    // Configure y-axes for each enabled channel
    channels.forEach((channel, index) => {
      const config = channelConfigs[channel];
      if (!config) return;

      const yAxisKey = config.yaxis;
      const isFirstAxis = index === 0;
      const position = index === 0 ? 'left' : 
                     index === 1 ? 'right' : 
                     index % 2 === 0 ? 'left' : 'right';

      layoutConfig[yAxisKey] = {
        title: `${config.name} (${config.unit})`,
        titlefont: { color: config.color },
        tickfont: { color: config.color },
        range: config.range,
        tickformat: config.tickformat,
        dtick: config.dtick,
        side: position,
        showgrid: isFirstAxis,
        gridwidth: 1,
        zeroline: false,
        ...(index > 1 && {
          overlaying: 'y',
          position: index % 2 === 0 ? 0.05 * Math.floor(index / 2) : 1 - 0.05 * Math.floor(index / 2)
        })
      };
    });

    return layoutConfig;
  }, [processedData, channels, channelConfigs]);

  // Calculate statistics if requested
  const statistics = useMemo(() => {
    if (!showStatistics || !processedData) return null;

    const { driver1, driver2 } = processedData;
    const stats = {};

    channels.forEach(channel => {
      const config = channelConfigs[channel];
      if (!config) return;

      const getChannelData = (driverData, channelName) => {
        const variations = [channelName, channelName.replace('_', ''), channelName + '_pos'];
        for (const variation of variations) {
          if (driverData[variation]) return driverData[variation];
        }
        return [];
      };

      const driver1Data = getChannelData(driver1, channel);
      const driver2Data = getChannelData(driver2, channel);

      if (driver1Data.length > 0 || driver2Data.length > 0) {
        stats[channel] = {
          name: config.name,
          unit: config.unit,
          driver1: {
            name: driver1.name,
            stats: calculatePerformanceStats(driver1Data)
          },
          driver2: {
            name: driver2.name,
            stats: calculatePerformanceStats(driver2Data)
          }
        };
      }
    });

    return stats;
  }, [showStatistics, processedData, channels, channelConfigs]);

  // Handle chart events
  const handleChartClick = (eventData) => {
    if (onDataPointClick && eventData.points && eventData.points.length > 0) {
      const point = eventData.points[0];
      onDataPointClick({
        distance: point.x,
        value: point.y,
        channel: point.customdata?.channel,
        unit: point.customdata?.unit,
        driverName: point.data.name
      });
    }
  };

  // If no data, show appropriate message
  if (!processedData && !loading && !error) {
    return (
      <div className={`engine-vitals-chart ${className}`}>
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">⚙️</div>
            <div className="text-gray-600 dark:text-gray-400">
              No engine vitals data available
            </div>
            <div className="text-gray-500 dark:text-gray-500 text-sm mt-1">
              Upload telemetry files to analyze engine performance
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`engine-vitals-chart ${className}`}>
      {/* Channel Selection */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(channelConfigs).map(channel => {
          const config = channelConfigs[channel];
          const isActive = channels.includes(channel);
          
          return (
            <button
              key={channel}
              onClick={() => {
                const newChannels = isActive 
                  ? channels.filter(c => c !== channel)
                  : [...channels, channel];
                // This would typically be handled by parent component
                console.log('Toggle channel:', channel, newChannels);
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {config.name}
            </button>
          );
        })}
      </div>

      {/* Statistics Panel */}
      {showStatistics && statistics && Object.keys(statistics).length > 0 && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(statistics).map(([channel, channelStats]) => (
            <div key={channel} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {channelStats.name} Statistics
              </h4>
              <div className="space-y-2">
                {[channelStats.driver1, channelStats.driver2].map((driverStat, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                      {driverStat.name}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Max:</span>
                        <span className="ml-1 font-mono">{driverStat.stats.max.toFixed(1)} {channelStats.unit}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                        <span className="ml-1 font-mono">{driverStat.stats.avg.toFixed(1)} {channelStats.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm text-gray-600 dark:text-gray-400">
        {channels.map(channel => {
          const config = channelConfigs[channel];
          if (!config) return null;
          
          return (
            <div key={channel} className="flex items-center gap-2">
              <div 
                className="w-3 h-0.5"
                style={{ 
                  backgroundColor: config.color,
                  opacity: config.lineStyle?.dash === 'solid' ? 1 : 0.7
                }}
              ></div>
              <span>{config.name}</span>
            </div>
          );
        })}
        
        {showThresholds && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500 opacity-50" style={{ borderTop: '2px dotted' }}></div>
            <span>Thresholds</span>
          </div>
        )}
      </div>

      {/* Warning indicators */}
      {showThresholds && (
        <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          Red lines indicate critical thresholds • Yellow lines indicate warning levels
        </div>
      )}
    </div>
  );
};

export default EngineVitalsChart;