import React, { useState, useEffect } from 'react';
import { 
  ChartProvider, 
  SpeedDistanceChart, 
  EngineVitalsChart, 
  ResponsiveChart 
} from '../components/Charts';

// Mock data generator for demonstration
const generateMockTelemetryData = (driverName, lapTime, points = 100) => {
  const data = {
    distance: [],
    speed: [],
    throttle: [],
    brake: [],
    gear: [],
    rpm: [],
    water_temp: [],
    oil_temp: []
  };

  for (let i = 0; i < points; i++) {
    const progress = i / points;
    const distance = progress * 3000; // 3km track
    
    // Simulate realistic speed profile
    let speed;
    if (progress < 0.2 || (progress > 0.4 && progress < 0.6) || progress > 0.8) {
      // Corner sections
      speed = 80 + Math.random() * 40;
    } else {
      // Straight sections
      speed = 160 + Math.random() * 60;
    }
    
    // Throttle based on speed profile
    const throttle = speed > 140 ? 85 + Math.random() * 15 : 20 + Math.random() * 60;
    
    // Brake in corners
    const brake = speed < 100 ? 10 + Math.random() * 30 : Math.random() * 5;
    
    // Gear based on speed
    const gear = speed < 60 ? 2 : speed < 100 ? 3 : speed < 140 ? 4 : speed < 180 ? 5 : 6;
    
    // RPM roughly correlates with speed and gear
    const rpm = (speed * 40) + Math.random() * 500 + 3000;
    
    // Engine temperatures
    const waterTemp = 85 + Math.random() * 10;
    const oilTemp = 100 + Math.random() * 15;
    
    data.distance.push(distance);
    data.speed.push(speed);
    data.throttle.push(throttle);
    data.brake.push(brake);
    data.gear.push(gear);
    data.rpm.push(rpm);
    data.water_temp.push(waterTemp);
    data.oil_temp.push(oilTemp);
  }
  
  return {
    success: true,
    driver1: { name: driverName, ...data },
    driver2: { name: 'Driver 2', ...data },
    distance: data.distance,
    channels: {
      speed: { driver1: data.speed, driver2: data.speed.map(s => s * (0.95 + Math.random() * 0.1)) },
      throttle: { driver1: data.throttle, driver2: data.throttle.map(t => t * (0.9 + Math.random() * 0.2)) },
      brake: { driver1: data.brake, driver2: data.brake.map(b => b * (0.8 + Math.random() * 0.4)) },
      gear: { driver1: data.gear, driver2: data.gear },
      rpm: { driver1: data.rpm, driver2: data.rpm.map(r => r * (0.95 + Math.random() * 0.1)) }
    }
  };
};

const ChartDemo = () => {
  const [mockData, setMockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [speedFeatures, setSpeedFeatures] = useState({
    sectors: { label: 'Show Sectors', enabled: true },
    trackFeatures: { label: 'Track Features', enabled: true },
    statistics: { label: 'Statistics', enabled: false }
  });
  const [engineFeatures, setEngineFeatures] = useState({
    thresholds: { label: 'Warning Thresholds', enabled: true },
    statistics: { label: 'Statistics', enabled: false }
  });

  // Generate mock data on component mount
  useEffect(() => {
    setTimeout(() => {
      const data = generateMockTelemetryData('Lewis Hamilton', 94.5);
      setMockData(data);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSpeedFeatureToggle = (feature) => {
    setSpeedFeatures(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        enabled: !prev[feature].enabled
      }
    }));
  };

  const handleEngineFeatureToggle = (feature) => {
    setEngineFeatures(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        enabled: !prev[feature].enabled
      }
    }));
  };

  return (
    <ChartProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              🏁 Formula 4 Telemetry Charts
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Interactive visualization components for racing telemetry analysis
            </p>
          </div>

          {/* Chart Grid */}
          <div className="space-y-8">
            {/* Speed vs Distance Chart */}
            <ResponsiveChart
              title="Speed vs Distance Analysis"
              subtitle="Comparative speed analysis across track distance"
              features={speedFeatures}
              onFeatureToggle={handleSpeedFeatureToggle}
              exportData={mockData}
              showControls={true}
              showExport={true}
            >
              <SpeedDistanceChart
                comparisonData={mockData}
                showSectors={speedFeatures.sectors.enabled}
                showTrackFeatures={speedFeatures.trackFeatures.enabled}
                showStatistics={speedFeatures.statistics.enabled}
                loading={loading}
                height={450}
                onDataPointClick={(data) => {
                  console.log('Speed chart clicked:', data);
                }}
              />
            </ResponsiveChart>

            {/* Engine Vitals Chart */}
            <ResponsiveChart
              title="Engine Vitals Monitoring"
              subtitle="Multi-axis engine performance and temperature analysis"
              features={engineFeatures}
              onFeatureToggle={handleEngineFeatureToggle}
              exportData={mockData}
              showControls={true}
              showExport={true}
            >
              <EngineVitalsChart
                comparisonData={mockData}
                channels={['rpm', 'water_temp', 'oil_temp']}
                showThresholds={engineFeatures.thresholds.enabled}
                showStatistics={engineFeatures.statistics.enabled}
                thresholds={{
                  rpm: { redline: 7500, shift: 7000 },
                  water_temp: { warning: 95, critical: 105 },
                  oil_temp: { warning: 120, critical: 130 }
                }}
                loading={loading}
                height={450}
                onDataPointClick={(data) => {
                  console.log('Engine vitals clicked:', data);
                }}
              />
            </ResponsiveChart>

            {/* Chart Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Chart Features
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Speed vs Distance Chart
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Dual-driver speed comparison</li>
                    <li>• Interactive tooltips with detailed data</li>
                    <li>• Track sector visualization</li>
                    <li>• Corner and straight detection</li>
                    <li>• Performance statistics</li>
                    <li>• Zoom and pan controls</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Engine Vitals Chart
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Multi-axis engine monitoring</li>
                    <li>• RPM, water and oil temperature</li>
                    <li>• Warning threshold indicators</li>
                    <li>• Critical value alerts</li>
                    <li>• Configurable channel selection</li>
                    <li>• Performance metrics analysis</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Export Options
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Charts can be exported as high-resolution PNG images, scalable SVG vectors, 
                  or CSV data files for further analysis. Use the export button in the chart 
                  controls to access these options.
                </p>
              </div>
            </div>

            {/* Performance Metrics */}
            {mockData && !loading && (
              <div className="racing-metrics-grid">
                <div className="racing-metric-card">
                  <div className="racing-metric-label">Data Points</div>
                  <div className="racing-metric-value">
                    {mockData.distance?.length || 0}
                    <span className="racing-metric-unit">points</span>
                  </div>
                </div>
                
                <div className="racing-metric-card">
                  <div className="racing-metric-label">Track Distance</div>
                  <div className="racing-metric-value">
                    {((Math.max(...(mockData.distance || [0]))) / 1000).toFixed(1)}
                    <span className="racing-metric-unit">km</span>
                  </div>
                </div>
                
                <div className="racing-metric-card">
                  <div className="racing-metric-label">Max Speed</div>
                  <div className="racing-metric-value">
                    {Math.max(...(mockData.channels?.speed?.driver1 || [0])).toFixed(0)}
                    <span className="racing-metric-unit">km/h</span>
                  </div>
                </div>
                
                <div className="racing-metric-card">
                  <div className="racing-metric-label">Charts Active</div>
                  <div className="racing-metric-value">
                    2
                    <span className="racing-metric-unit">charts</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ChartProvider>
  );
};

export default ChartDemo;