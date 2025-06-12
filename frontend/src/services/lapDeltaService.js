/**
 * Service for handling lap delta API calls
 */

const DATA_PROCESSING_BASE_URL = process.env.REACT_APP_DATA_PROCESSING_URL || 'http://localhost:8000';

export class LapDeltaService {
  /**
   * Get lap delta analysis between two drivers
   * @param {File} file1 - First driver's telemetry file
   * @param {File} file2 - Second driver's telemetry file
   * @param {Object} options - Analysis options
   * @param {number} options.lap1Number - Specific lap number for driver 1
   * @param {number} options.lap2Number - Specific lap number for driver 2
   * @param {string} options.authToken - Authentication token
   * @returns {Promise<Object>} Lap delta analysis data
   */
  static async getLapDelta(file1, file2, options = {}) {
    try {
      const formData = new FormData();
      formData.append('files', file1);
      formData.append('files', file2);
      
      if (options.lap1Number !== undefined) {
        formData.append('lap1_number', options.lap1Number.toString());
      }
      
      if (options.lap2Number !== undefined) {
        formData.append('lap2_number', options.lap2Number.toString());
      }

      const headers = {};
      if (options.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`;
      }

      const response = await fetch(`${DATA_PROCESSING_BASE_URL}/telemetry/lap-delta`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Lap delta analysis failed');
      }

      return data;
    } catch (error) {
      console.error('Lap delta service error:', error);
      throw error;
    }
  }

  /**
   * Get detailed comparison data (includes lap delta and other metrics)
   * @param {File} file1 - First driver's telemetry file
   * @param {File} file2 - Second driver's telemetry file
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Detailed comparison data
   */
  static async getDetailedComparison(file1, file2, options = {}) {
    try {
      const formData = new FormData();
      formData.append('files', file1);
      formData.append('files', file2);
      formData.append('use_fastest_laps', options.useFastestLaps !== false);
      
      if (options.lap1Number !== undefined) {
        formData.append('lap1_number', options.lap1Number.toString());
      }
      
      if (options.lap2Number !== undefined) {
        formData.append('lap2_number', options.lap2Number.toString());
      }

      const headers = {};
      if (options.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`;
      }

      const response = await fetch(`${DATA_PROCESSING_BASE_URL}/telemetry/compare-detailed`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Detailed comparison service error:', error);
      throw error;
    }
  }

  /**
   * Get lap comparison data for visualization
   * @param {File} file1 - First driver's telemetry file
   * @param {File} file2 - Second driver's telemetry file
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Lap comparison visualization data
   */
  static async getLapComparisonData(file1, file2, options = {}) {
    try {
      const formData = new FormData();
      formData.append('files', file1);
      formData.append('files', file2);
      
      if (options.lap1Number !== undefined) {
        formData.append('lap1_number', options.lap1Number.toString());
      }
      
      if (options.lap2Number !== undefined) {
        formData.append('lap2_number', options.lap2Number.toString());
      }

      const response = await fetch(`${DATA_PROCESSING_BASE_URL}/telemetry/lap-comparison-data`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Lap comparison data retrieval failed');
      }

      return data;
    } catch (error) {
      console.error('Lap comparison data service error:', error);
      throw error;
    }
  }

  /**
   * Validate files before upload
   * @param {File} file1 - First file to validate
   * @param {File} file2 - Second file to validate
   * @returns {Object} Validation result
   */
  static validateFiles(file1, file2) {
    const errors = [];

    if (!file1 || !file2) {
      errors.push('Both telemetry files are required');
    }

    if (file1 && !file1.name.toLowerCase().endsWith('.csv')) {
      errors.push('First file must be a CSV file');
    }

    if (file2 && !file2.name.toLowerCase().endsWith('.csv')) {
      errors.push('Second file must be a CSV file');
    }

    if (file1 && file1.size > 50 * 1024 * 1024) { // 50MB
      errors.push('First file is too large (max 50MB)');
    }

    if (file2 && file2.size > 50 * 1024 * 1024) { // 50MB
      errors.push('Second file is too large (max 50MB)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enhanced data validation and interpolation for missing values
   * @param {Array} deltaArray - Array of delta values
   * @param {Array} distanceArray - Array of distance values
   * @returns {Object} Validated and processed data
   */
  static validateAndProcessDeltaData(deltaArray, distanceArray) {
    if (!Array.isArray(deltaArray) || !Array.isArray(distanceArray)) {
      throw new Error('Invalid data format: arrays expected');
    }

    if (deltaArray.length !== distanceArray.length) {
      throw new Error('Data length mismatch between delta and distance arrays');
    }

    // Remove any NaN or invalid values
    const cleanData = [];
    for (let i = 0; i < deltaArray.length; i++) {
      const delta = parseFloat(deltaArray[i]);
      const distance = parseFloat(distanceArray[i]);
      
      if (!isNaN(delta) && !isNaN(distance) && isFinite(delta) && isFinite(distance)) {
        cleanData.push({ delta, distance, index: i });
      }
    }

    if (cleanData.length < 10) {
      throw new Error('Insufficient valid data points for analysis');
    }

    // Interpolate missing values if gaps exist
    const interpolatedData = this.interpolateMissingValues(cleanData, deltaArray.length);
    
    return {
      deltas: interpolatedData.map(d => d.delta),
      distances: interpolatedData.map(d => d.distance),
      validPointsPercentage: (cleanData.length / deltaArray.length) * 100,
      interpolatedPoints: interpolatedData.length - cleanData.length
    };
  }

  /**
   * Interpolate missing values in delta data
   * @param {Array} cleanData - Array of valid data points
   * @param {number} targetLength - Target array length
   * @returns {Array} Interpolated data array
   */
  static interpolateMissingValues(cleanData, targetLength) {
    if (cleanData.length === targetLength) {
      return cleanData;
    }

    const interpolated = [];
    let cleanIndex = 0;

    for (let i = 0; i < targetLength; i++) {
      // If we have a clean data point at this index, use it
      if (cleanIndex < cleanData.length && cleanData[cleanIndex].index === i) {
        interpolated.push(cleanData[cleanIndex]);
        cleanIndex++;
      } else {
        // Interpolate between surrounding points
        const prevPoint = cleanIndex > 0 ? cleanData[cleanIndex - 1] : cleanData[0];
        const nextPoint = cleanIndex < cleanData.length ? cleanData[cleanIndex] : cleanData[cleanData.length - 1];
        
        const ratio = nextPoint.index !== prevPoint.index ? 
          (i - prevPoint.index) / (nextPoint.index - prevPoint.index) : 0;
        
        interpolated.push({
          delta: prevPoint.delta + (nextPoint.delta - prevPoint.delta) * ratio,
          distance: prevPoint.distance + (nextPoint.distance - prevPoint.distance) * ratio,
          index: i,
          interpolated: true
        });
      }
    }

    return interpolated;
  }

  /**
   * Detect significant delta changes for annotations
   * @param {Array} deltaArray - Array of delta values
   * @param {Array} distanceArray - Array of distance values
   * @param {number} threshold - Threshold for significant change (default: 1.0 seconds)
   * @returns {Array} Array of significant change points
   */
  static detectSignificantChanges(deltaArray, distanceArray, threshold = 1.0) {
    const significantChanges = [];
    
    for (let i = 1; i < deltaArray.length; i++) {
      const deltaChange = Math.abs(deltaArray[i] - deltaArray[i - 1]);
      
      if (deltaChange >= threshold) {
        significantChanges.push({
          distance: distanceArray[i],
          delta: deltaArray[i],
          previousDelta: deltaArray[i - 1],
          change: deltaChange,
          type: deltaArray[i] > deltaArray[i - 1] ? 'gain' : 'loss',
          index: i
        });
      }
    }

    return significantChanges;
  }

  /**
   * Format lap delta data for display with enhanced processing
   * @param {Object} lapDeltaData - Raw lap delta data from API
   * @returns {Object} Formatted data for UI components
   */
  static formatLapDeltaData(lapDeltaData) {
    if (!lapDeltaData || !lapDeltaData.lap_delta) {
      return null;
    }

    const delta = lapDeltaData.lap_delta;
    
    try {
      // Validate and process the data
      const processedData = this.validateAndProcessDeltaData(
        delta.cumulative_delta_array || [],
        delta.distance_array || []
      );

      // Detect significant changes for annotations
      const significantChanges = this.detectSignificantChanges(
        processedData.deltas,
        processedData.distances
      );

      return {
        ...lapDeltaData,
        lap_delta: {
          ...delta,
          cumulative_delta_array: processedData.deltas,
          distance_array: processedData.distances,
          significant_changes: significantChanges,
          data_quality: {
            valid_points_percentage: processedData.validPointsPercentage,
            interpolated_points: processedData.interpolatedPoints,
            total_points: processedData.deltas.length
          }
        },
        summary: {
          finalGap: delta.cumulative_delta_final || 0,
          maxGap: delta.max_time_gap || 0,
          avgDelta: delta.avg_time_delta || 0,
          zeroCrossings: delta.zero_crossings?.length || 0,
          driver1AheadPercentage: delta.statistics?.driver1_ahead_percentage || 0,
          driver2AheadPercentage: delta.statistics?.driver2_ahead_percentage || 0,
          significantChanges: significantChanges.length
        }
      };
    } catch (error) {
      console.error('Data processing error:', error);
      // Return original data if processing fails
      return {
        ...lapDeltaData,
        summary: {
          finalGap: delta.cumulative_delta_final || 0,
          maxGap: delta.max_time_gap || 0,
          avgDelta: delta.avg_time_delta || 0,
          zeroCrossings: delta.zero_crossings?.length || 0,
          driver1AheadPercentage: delta.statistics?.driver1_ahead_percentage || 0,
          driver2AheadPercentage: delta.statistics?.driver2_ahead_percentage || 0
        },
        processingError: error.message
      };
    }
  }
}

export default LapDeltaService;