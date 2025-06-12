import { useCallback, useState } from 'react';
import { exportToCSV } from '../utils/chartUtils';

/**
 * Custom hook for handling chart export functionality
 */
export const useChartExport = (chartRef) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  /**
   * Export chart as image (PNG or SVG)
   */
  const exportImage = useCallback(async (format = 'png', options = {}) => {
    if (!chartRef?.current) {
      throw new Error('Chart reference not available');
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const defaultOptions = {
        format: format.toLowerCase(),
        width: options.width || 1200,
        height: options.height || 800,
        scale: options.scale || 2,
        filename: options.filename || `telemetry_chart_${Date.now()}`
      };

      // Use Plotly's downloadImage function
      const { downloadImage } = await import('plotly.js-dist');
      
      await downloadImage(chartRef.current, {
        ...defaultOptions,
        filename: `${defaultOptions.filename}.${defaultOptions.format}`
      });

      return true;
    } catch (error) {
      console.error('Export image error:', error);
      setExportError(error.message);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [chartRef]);

  /**
   * Export chart data as CSV
   */
  const exportCSV = useCallback(async (data, filename, options = {}) => {
    if (!data) {
      throw new Error('No data available for export');
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const csvFilename = filename || `telemetry_data_${Date.now()}.csv`;
      
      // Process data for CSV export
      let csvData = {};
      
      if (Array.isArray(data)) {
        // Handle array of plot data
        data.forEach((series, index) => {
          if (series.x && series.y) {
            const seriesName = series.name || `Series_${index + 1}`;
            csvData[`${seriesName}_Distance`] = series.x;
            csvData[`${seriesName}_Value`] = series.y;
          }
        });
      } else if (typeof data === 'object') {
        // Handle processed comparison data
        if (data.distance) {
          csvData['Distance_m'] = data.distance;
        }
        
        if (data.driver1) {
          Object.entries(data.driver1).forEach(([key, values]) => {
            if (Array.isArray(values) && key !== 'name') {
              csvData[`${data.driver1.name || 'Driver1'}_${key}`] = values;
            }
          });
        }
        
        if (data.driver2) {
          Object.entries(data.driver2).forEach(([key, values]) => {
            if (Array.isArray(values) && key !== 'name') {
              csvData[`${data.driver2.name || 'Driver2'}_${key}`] = values;
            }
          });
        }
      }

      if (Object.keys(csvData).length === 0) {
        throw new Error('No valid data found for CSV export');
      }

      exportToCSV(csvData, csvFilename);
      return true;
    } catch (error) {
      console.error('Export CSV error:', error);
      setExportError(error.message);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  /**
   * Main export function that handles different formats
   */
  const exportChart = useCallback(async (format, data, options = {}) => {
    try {
      const formatLower = format.toLowerCase();
      
      switch (formatLower) {
        case 'png':
        case 'svg':
          return await exportImage(formatLower, options);
        
        case 'csv':
          const filename = options.filename || `telemetry_data_${Date.now()}.csv`;
          return await exportCSV(data, filename, options);
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message);
      throw error;
    }
  }, [exportImage, exportCSV]);

  /**
   * Get chart image as data URL (for previews or further processing)
   */
  const getChartDataURL = useCallback(async (format = 'png', options = {}) => {
    if (!chartRef?.current) {
      throw new Error('Chart reference not available');
    }

    try {
      const { toImage } = await import('plotly.js-dist');
      
      const defaultOptions = {
        format: format.toLowerCase(),
        width: options.width || 1200,
        height: options.height || 800,
        scale: options.scale || 2
      };

      const dataURL = await toImage(chartRef.current, defaultOptions);
      return dataURL;
    } catch (error) {
      console.error('Get chart data URL error:', error);
      throw error;
    }
  }, [chartRef]);

  /**
   * Batch export multiple formats
   */
  const exportMultiple = useCallback(async (formats, data, baseFilename, options = {}) => {
    const results = [];
    
    for (const format of formats) {
      try {
        const filename = `${baseFilename}_${Date.now()}`;
        await exportChart(format, data, { ...options, filename });
        results.push({ format, success: true });
      } catch (error) {
        console.error(`Failed to export ${format}:`, error);
        results.push({ format, success: false, error: error.message });
      }
    }
    
    return results;
  }, [exportChart]);

  /**
   * Clear export error
   */
  const clearError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    isExporting,
    exportError,
    exportChart,
    exportImage,
    exportCSV,
    getChartDataURL,
    exportMultiple,
    clearError
  };
};