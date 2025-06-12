/**
 * GPS Processing Service
 * Handles extraction and processing of GPS data from telemetry files for 3D track visualization
 */

class GPSProcessingService {
  constructor() {
    this.distanceThreshold = 10; // meters - interpolation interval
    this.smoothingWindow = 5; // points for moving average
  }

  /**
   * Extract GPS data from telemetry files
   * @param {File} file1 - First driver's telemetry file
   * @param {File} file2 - Second driver's telemetry file
   * @returns {Promise<Object>} Processed GPS data for both drivers
   */
  async extractGPSData(file1, file2) {
    try {
      const [data1, data2] = await Promise.all([
        this.parseCSVFile(file1),
        this.parseCSVFile(file2)
      ]);

      const processedData1 = this.processDriverGPSData(data1, file1.name);
      const processedData2 = this.processDriverGPSData(data2, file2.name);

      return {
        driver1: processedData1,
        driver2: processedData2,
        trackInfo: this.generateTrackInfo([processedData1, processedData2])
      };
    } catch (error) {
      throw new Error(`GPS data extraction failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV file and extract telemetry data
   * @param {File} file - CSV file to parse
   * @returns {Promise<Array>} Parsed telemetry data
   */
  async parseCSVFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          
          // Skip metadata header (first 14 rows)
          const dataLines = lines.slice(14);
          const headers = dataLines[0].split(',').map(h => h.trim());
          
          const data = [];
          for (let i = 1; i < dataLines.length; i++) {
            if (dataLines[i].trim()) {
              const values = dataLines[i].split(',');
              const row = {};
              headers.forEach((header, index) => {
                const value = values[index]?.trim();
                row[header] = value && !isNaN(value) ? parseFloat(value) : value;
              });
              data.push(row);
            }
          }
          
          resolve(data);
        } catch (error) {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }

  /**
   * Process GPS data for a single driver
   * @param {Array} rawData - Raw telemetry data
   * @param {string} filename - Driver filename for name extraction
   * @returns {Object} Processed GPS data
   */
  processDriverGPSData(rawData, filename) {
    // Extract driver name from filename
    const driverName = this.extractDriverName(filename);

    // Extract fastest lap data
    const fastestLapData = this.extractFastestLap(rawData);

    if (!fastestLapData || fastestLapData.length === 0) {
      throw new Error(`No valid fastest lap data found for ${driverName}`);
    }

    // Extract GPS coordinates and related data
    const gpsData = this.extractGPSCoordinates(fastestLapData);
    
    // Validate GPS data
    this.validateGPSData(gpsData);

    // Smooth GPS data to reduce noise
    const smoothedData = this.smoothGPSData(gpsData);

    // Calculate track distances
    const processedData = this.calculateTrackDistances(smoothedData);

    // Interpolate data over distance for consistent spacing
    const interpolatedData = this.interpolateOverDistance(processedData);

    return {
      name: driverName,
      coordinates: interpolatedData,
      rawDataPoints: fastestLapData.length,
      processedDataPoints: interpolatedData.latitude.length,
      metadata: {
        filename,
        fastestLapTime: this.calculateLapTime(fastestLapData),
        trackLength: Math.max(...interpolatedData.distance),
        elevationRange: {
          min: Math.min(...interpolatedData.elevation),
          max: Math.max(...interpolatedData.elevation),
          delta: Math.max(...interpolatedData.elevation) - Math.min(...interpolatedData.elevation)
        }
      }
    };
  }

  /**
   * Extract driver name from filename
   * @param {string} filename - File name
   * @returns {string} Driver name
   */
  extractDriverName(filename) {
    // Remove file extension and extract driver name
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Try to extract name from common formats
    // Format: "Driver Name Round X Race Y Telemetry"
    const match = nameWithoutExt.match(/^([A-Za-z\s]+?)(?:\s+Round|\s+Race|\s+Telemetry|$)/);
    return match ? match[1].trim() : nameWithoutExt;
  }

  /**
   * Extract fastest lap from telemetry data
   * @param {Array} data - Raw telemetry data
   * @returns {Array} Fastest lap data points
   */
  extractFastestLap(data) {
    if (!data || data.length === 0) return [];

    // Find lap time boundaries (95-120 seconds is typical for F4)
    const validLapTimes = data.filter(point => 
      point.Time >= 95 && point.Time <= 120
    );

    if (validLapTimes.length === 0) {
      // If no valid lap times, use first 100 seconds of data
      return data.filter(point => point.Time <= 100);
    }

    return validLapTimes;
  }

  /**
   * Extract GPS coordinates from telemetry data
   * @param {Array} data - Telemetry data
   * @returns {Object} GPS coordinates and related data
   */
  extractGPSCoordinates(data) {
    return {
      latitude: data.map(point => point['GPS Latitude'] || point.latitude || 0),
      longitude: data.map(point => point['GPS Longitude'] || point.longitude || 0),
      elevation: data.map(point => point['GPS Altitude'] || point.altitude || 0),
      speed: data.map(point => point['GPS Speed'] || point.speed || 0),
      time: data.map(point => point.Time || point.time || 0),
      distance: data.map(point => point['Distance on GPS Speed'] || 0)
    };
  }

  /**
   * Validate GPS data quality
   * @param {Object} gpsData - GPS data to validate
   */
  validateGPSData(gpsData) {
    const { latitude, longitude } = gpsData;
    
    // Check for valid coordinates
    const validCoords = latitude.filter((lat, i) => 
      lat !== 0 && longitude[i] !== 0 && 
      Math.abs(lat) <= 90 && Math.abs(longitude[i]) <= 180
    );

    if (validCoords.length < latitude.length * 0.5) {
      throw new Error('Insufficient valid GPS coordinates in telemetry data');
    }

    // Check for coordinate variation (ensure we have actual track data)
    const latRange = Math.max(...latitude) - Math.min(...latitude);
    const lonRange = Math.max(...longitude) - Math.min(...longitude);
    
    if (latRange < 0.001 || lonRange < 0.001) {
      throw new Error('GPS coordinates show insufficient variation - may be static data');
    }
  }

  /**
   * Smooth GPS data using moving average
   * @param {Object} gpsData - Raw GPS data
   * @returns {Object} Smoothed GPS data
   */
  smoothGPSData(gpsData) {
    const smoothed = {};
    
    Object.keys(gpsData).forEach(key => {
      smoothed[key] = this.applyMovingAverage(gpsData[key], this.smoothingWindow);
    });

    return smoothed;
  }

  /**
   * Apply moving average smoothing
   * @param {Array} data - Data array to smooth
   * @param {number} window - Window size for moving average
   * @returns {Array} Smoothed data
   */
  applyMovingAverage(data, window) {
    if (data.length <= window) return data;

    const smoothed = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(data.length, i + Math.ceil(window / 2));
      const slice = data.slice(start, end);
      const average = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      smoothed.push(average);
    }

    return smoothed;
  }

  /**
   * Calculate cumulative track distances
   * @param {Object} gpsData - GPS data with coordinates
   * @returns {Object} GPS data with calculated distances
   */
  calculateTrackDistances(gpsData) {
    const { latitude, longitude } = gpsData;
    const distances = [0];

    for (let i = 1; i < latitude.length; i++) {
      const dist = this.calculateDistance(
        latitude[i - 1], longitude[i - 1],
        latitude[i], longitude[i]
      );
      distances.push(distances[i - 1] + dist);
    }

    return {
      ...gpsData,
      distance: distances
    };
  }

  /**
   * Calculate distance between two GPS points using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Interpolate data over distance for consistent spacing
   * @param {Object} gpsData - GPS data with distances
   * @returns {Object} Interpolated GPS data
   */
  interpolateOverDistance(gpsData) {
    const { distance } = gpsData;
    const maxDistance = Math.max(...distance);
    const targetPoints = Math.min(1000, Math.max(100, Math.floor(maxDistance / this.distanceThreshold)));
    
    const interpolatedDistances = [];
    for (let i = 0; i < targetPoints; i++) {
      interpolatedDistances.push((i / (targetPoints - 1)) * maxDistance);
    }

    const interpolated = { distance: interpolatedDistances };

    // Interpolate each data series
    Object.keys(gpsData).forEach(key => {
      if (key !== 'distance') {
        interpolated[key] = this.interpolateArray(distance, gpsData[key], interpolatedDistances);
      }
    });

    return interpolated;
  }

  /**
   * Interpolate an array of values
   * @param {Array} xOriginal - Original x values
   * @param {Array} yOriginal - Original y values
   * @param {Array} xTarget - Target x values for interpolation
   * @returns {Array} Interpolated y values
   */
  interpolateArray(xOriginal, yOriginal, xTarget) {
    return xTarget.map(x => {
      // Find surrounding points
      let i = 0;
      while (i < xOriginal.length - 1 && xOriginal[i + 1] < x) {
        i++;
      }

      if (i === xOriginal.length - 1) {
        return yOriginal[i];
      }

      // Linear interpolation
      const x1 = xOriginal[i];
      const x2 = xOriginal[i + 1];
      const y1 = yOriginal[i];
      const y2 = yOriginal[i + 1];

      return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
    });
  }

  /**
   * Calculate lap time from telemetry data
   * @param {Array} lapData - Lap telemetry data
   * @returns {number} Lap time in seconds
   */
  calculateLapTime(lapData) {
    if (!lapData || lapData.length === 0) return 0;
    
    const times = lapData.map(point => point.Time || point.time || 0);
    return Math.max(...times) - Math.min(...times);
  }

  /**
   * Generate track information from processed GPS data
   * @param {Array} driversData - Array of processed driver data
   * @returns {Object} Track information
   */
  generateTrackInfo(driversData) {
    if (!driversData || driversData.length === 0) return {};

    const totalDistance = Math.max(...driversData.map(d => 
      Math.max(...d.coordinates.distance)
    ));

    // Generate sectors (divide track into 3 equal parts)
    const sectorLength = totalDistance / 3;
    const sectors = [
      { start: 0, end: sectorLength, color: '#EF4444', name: 'Sector 1' },
      { start: sectorLength, end: sectorLength * 2, color: '#10B981', name: 'Sector 2' },
      { start: sectorLength * 2, end: totalDistance, color: '#3B82F6', name: 'Sector 3' }
    ];

    // Identify potential corners based on GPS data
    const corners = this.identifyCorners(driversData[0].coordinates);

    return {
      totalDistance: Math.round(totalDistance),
      sectors,
      corners,
      elevationProfile: {
        min: Math.min(...driversData.map(d => Math.min(...d.coordinates.elevation))),
        max: Math.max(...driversData.map(d => Math.max(...d.coordinates.elevation))),
        variation: Math.max(...driversData.map(d => 
          Math.max(...d.coordinates.elevation) - Math.min(...d.coordinates.elevation)
        ))
      }
    };
  }

  /**
   * Identify potential corners in the track
   * @param {Object} coordinates - GPS coordinates
   * @returns {Array} Array of corner objects
   */
  identifyCorners(coordinates) {
    const corners = [];
    const { latitude, longitude, distance, speed } = coordinates;
    
    // Look for significant direction changes and speed reductions
    for (let i = 10; i < latitude.length - 10; i++) {
      const prevBearing = this.calculateBearing(
        latitude[i - 10], longitude[i - 10],
        latitude[i], longitude[i]
      );
      const nextBearing = this.calculateBearing(
        latitude[i], longitude[i],
        latitude[i + 10], longitude[i + 10]
      );

      const bearingChange = Math.abs(nextBearing - prevBearing);
      const speedChange = (speed[i - 5] - speed[i + 5]) / speed[i - 5];

      // Identify as corner if significant bearing change and speed reduction
      if (bearingChange > 30 && speedChange > 0.1) {
        corners.push({
          distance: Math.round(distance[i]),
          name: `Turn ${corners.length + 1}`,
          type: bearingChange > 90 ? 'hairpin' : bearingChange > 60 ? 'tight' : 'medium',
          bearingChange: Math.round(bearingChange),
          speedReduction: Math.round(speedChange * 100)
        });
      }
    }

    return corners.slice(0, 8); // Limit to 8 corners maximum
  }

  /**
   * Calculate bearing between two GPS points
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Bearing in degrees
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
  }

  /**
   * Validate that files contain GPS data
   * @param {File} file1 - First file
   * @param {File} file2 - Second file
   * @returns {Object} Validation result
   */
  validateGPSFiles(file1, file2) {
    const errors = [];

    if (!file1 || !file2) {
      errors.push('Both files are required for GPS analysis');
    }

    if (file1 && !file1.name.toLowerCase().endsWith('.csv')) {
      errors.push('First file must be a CSV file');
    }

    if (file2 && !file2.name.toLowerCase().endsWith('.csv')) {
      errors.push('Second file must be a CSV file');
    }

    if (file1 && file1.size > 52428800) { // 50MB
      errors.push('First file exceeds 50MB limit');
    }

    if (file2 && file2.size > 52428800) { // 50MB
      errors.push('Second file exceeds 50MB limit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default new GPSProcessingService();