// Utility functions for chart data processing and formatting

/**
 * Format telemetry data for chart consumption
 */
export const formatTelemetryData = (telemetryPoints, channelName) => {
  if (!telemetryPoints || !Array.isArray(telemetryPoints)) {
    return { x: [], y: [] };
  }

  const validPoints = telemetryPoints.filter(point => 
    point && 
    typeof point === 'object' && 
    point[channelName] !== null && 
    point[channelName] !== undefined &&
    !isNaN(point[channelName])
  );

  return {
    x: validPoints.map(point => point.distance || point.time || 0),
    y: validPoints.map(point => point[channelName])
  };
};

/**
 * Process comparison data for dual-driver charts
 */
export const processComparisonData = (comparisonResult) => {
  if (!comparisonResult || !comparisonResult.success) {
    return null;
  }

  const { aligned_data, driver1, driver2 } = comparisonResult;
  
  if (!aligned_data || !aligned_data.distance) {
    return null;
  }

  return {
    distance: aligned_data.distance,
    driver1: {
      name: driver1?.name || 'Driver 1',
      speed: aligned_data.channels?.speed?.driver1 || [],
      throttle: aligned_data.channels?.throttle?.driver1 || [],
      brake: aligned_data.channels?.brake?.driver1 || [],
      gear: aligned_data.channels?.gear?.driver1 || [],
      rpm: aligned_data.channels?.rpm?.driver1 || []
    },
    driver2: {
      name: driver2?.name || 'Driver 2',
      speed: aligned_data.channels?.speed?.driver2 || [],
      throttle: aligned_data.channels?.throttle?.driver2 || [],
      brake: aligned_data.channels?.brake?.driver2 || [],
      gear: aligned_data.channels?.gear?.driver2 || [],
      rpm: aligned_data.channels?.rpm?.driver2 || []
    }
  };
};

/**
 * Create track sector markers for distance-based charts
 */
export const createSectorMarkers = (totalDistance, numSectors = 3, colors) => {
  const sectorLength = totalDistance / numSectors;
  const markers = [];

  for (let i = 1; i < numSectors; i++) {
    const sectorDistance = i * sectorLength;
    markers.push({
      type: 'scatter',
      x: [sectorDistance, sectorDistance],
      y: [0, 1], // Will be scaled to chart's y-range
      mode: 'lines',
      line: {
        color: colors.textSecondary,
        width: 1,
        dash: 'dash'
      },
      showlegend: false,
      hoverinfo: 'skip',
      yaxis: 'y',
      name: `Sector ${i}`
    });
  }

  return markers;
};

/**
 * Calculate performance statistics
 */
export const calculatePerformanceStats = (data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      std: 0,
      median: 0
    };
  }

  const validData = data.filter(val => val !== null && val !== undefined && !isNaN(val));
  
  if (validData.length === 0) {
    return { min: 0, max: 0, avg: 0, std: 0, median: 0 };
  }

  const sorted = validData.slice().sort((a, b) => a - b);
  const sum = validData.reduce((acc, val) => acc + val, 0);
  const avg = sum / validData.length;
  
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / validData.length;
  const std = Math.sqrt(variance);
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  return {
    min: Math.min(...validData),
    max: Math.max(...validData),
    avg,
    std,
    median
  };
};

/**
 * Generate custom hover templates for racing data
 */
export const createHoverTemplate = (channelType, driverName) => {
  const templates = {
    speed: `<b>${driverName}</b><br>` +
           `Speed: %{y:.1f} km/h<br>` +
           `Distance: %{x:.0f}m<br>` +
           `<extra></extra>`,
    
    throttle: `<b>${driverName}</b><br>` +
              `Throttle: %{y:.1f}%<br>` +
              `Distance: %{x:.0f}m<br>` +
              `<extra></extra>`,
    
    brake: `<b>${driverName}</b><br>` +
           `Brake: %{y:.1f}%<br>` +
           `Distance: %{x:.0f}m<br>` +
           `<extra></extra>`,
    
    rpm: `<b>${driverName}</b><br>` +
         `RPM: %{y:.0f}<br>` +
         `Distance: %{x:.0f}m<br>` +
         `<extra></extra>`,
    
    temperature: `<b>${driverName}</b><br>` +
                 `Temperature: %{y:.1f}°C<br>` +
                 `Distance: %{x:.0f}m<br>` +
                 `<extra></extra>`
  };

  return templates[channelType] || templates.speed;
};

/**
 * Create threshold lines for engine vitals
 */
export const createThresholdLines = (xRange, thresholds, colors) => {
  const lines = [];

  Object.entries(thresholds).forEach(([name, value]) => {
    lines.push({
      type: 'scatter',
      x: xRange,
      y: Array(xRange.length).fill(value),
      mode: 'lines',
      line: {
        color: colors.warning,
        width: 2,
        dash: 'dot'
      },
      name: `${name} Limit`,
      showlegend: true,
      hovertemplate: `${name}: ${value}<extra></extra>`
    });
  });

  return lines;
};

/**
 * Sample data points for performance optimization
 */
export const sampleDataPoints = (data, maxPoints = 1000) => {
  if (!data || !Array.isArray(data) || data.length <= maxPoints) {
    return data;
  }

  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};

/**
 * Detect track features from telemetry data
 */
export const detectTrackFeatures = (speedData, distanceData, thresholds = {}) => {
  const features = {
    corners: [],
    straights: [],
    brakingZones: []
  };

  if (!speedData || !distanceData || speedData.length !== distanceData.length) {
    return features;
  }

  const cornerSpeedThreshold = thresholds.cornerSpeed || 100; // km/h
  const straightSpeedThreshold = thresholds.straightSpeed || 150; // km/h
  const minFeatureLength = thresholds.minLength || 50; // meters

  let currentFeature = null;
  let featureType = null;

  for (let i = 0; i < speedData.length; i++) {
    const speed = speedData[i];
    const distance = distanceData[i];

    // Determine current segment type
    let segmentType = 'normal';
    if (speed < cornerSpeedThreshold) {
      segmentType = 'corner';
    } else if (speed > straightSpeedThreshold) {
      segmentType = 'straight';
    }

    // Track feature changes
    if (segmentType !== featureType) {
      // End current feature if it's long enough
      if (currentFeature && distance - currentFeature.start >= minFeatureLength) {
        currentFeature.end = distance;
        features[`${featureType}s`].push(currentFeature);
      }

      // Start new feature
      if (segmentType !== 'normal') {
        currentFeature = {
          start: distance,
          type: segmentType,
          minSpeed: speed,
          maxSpeed: speed
        };
        featureType = segmentType;
      } else {
        currentFeature = null;
        featureType = null;
      }
    } else if (currentFeature) {
      // Update current feature
      currentFeature.minSpeed = Math.min(currentFeature.minSpeed, speed);
      currentFeature.maxSpeed = Math.max(currentFeature.maxSpeed, speed);
    }
  }

  // Close final feature
  if (currentFeature && featureType) {
    currentFeature.end = distanceData[distanceData.length - 1];
    features[`${featureType}s`].push(currentFeature);
  }

  return features;
};

/**
 * Export chart data to CSV format
 */
export const exportToCSV = (data, filename = 'telemetry_data.csv') => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data for CSV export');
  }

  // Extract headers and rows
  const headers = Object.keys(data);
  const maxLength = Math.max(...headers.map(header => 
    Array.isArray(data[header]) ? data[header].length : 0
  ));

  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  for (let i = 0; i < maxLength; i++) {
    const row = headers.map(header => {
      const value = Array.isArray(data[header]) ? data[header][i] : '';
      return value !== null && value !== undefined ? value : '';
    });
    csvContent += row.join(',') + '\n';
  }

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Validate telemetry data structure
 */
export const validateTelemetryData = (data) => {
  const errors = [];

  if (!data) {
    errors.push('No data provided');
    return { valid: false, errors };
  }

  if (!Array.isArray(data) && typeof data !== 'object') {
    errors.push('Data must be an array or object');
    return { valid: false, errors };
  }

  // Check for required fields in array data
  if (Array.isArray(data)) {
    if (data.length === 0) {
      errors.push('Data array is empty');
    } else {
      const requiredFields = ['time', 'speed'];
      const firstPoint = data[0];
      
      requiredFields.forEach(field => {
        if (!(field in firstPoint)) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};