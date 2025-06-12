/**
 * Chart Synchronization Service
 * Handles synchronized interactions across multiple racing telemetry charts
 */

class ChartSyncService {
  constructor() {
    this.subscribers = new Map();
    this.currentState = {
      xRange: null,
      yRange: null,
      cursorPosition: null,
      selectedDataPoint: null,
      zoomLevel: 1
    };
  }

  /**
   * Subscribe a chart to synchronization events
   * @param {string} chartId - Unique identifier for the chart
   * @param {Object} callbacks - Event callback functions
   */
  subscribe(chartId, callbacks) {
    this.subscribers.set(chartId, {
      ...callbacks,
      id: chartId,
      active: true
    });

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(chartId);
    };
  }

  /**
   * Broadcast zoom event to all subscribed charts
   * @param {string} sourceChartId - Chart that initiated the zoom
   * @param {Object} zoomData - Zoom range data
   */
  broadcastZoom(sourceChartId, zoomData) {
    this.currentState.xRange = zoomData.xRange;
    this.currentState.yRange = zoomData.yRange;
    this.currentState.zoomLevel = zoomData.zoomLevel || 1;

    this.subscribers.forEach((subscriber, chartId) => {
      if (chartId !== sourceChartId && subscriber.active && subscriber.onZoom) {
        try {
          subscriber.onZoom(zoomData);
        } catch (error) {
          console.error(`Chart sync error for ${chartId}:`, error);
        }
      }
    });
  }

  /**
   * Broadcast cursor position to all subscribed charts
   * @param {string} sourceChartId - Chart that initiated the cursor move
   * @param {number} position - Cursor position (distance or time)
   * @param {Object} dataPoint - Associated data point information
   */
  broadcastCursor(sourceChartId, position, dataPoint = null) {
    this.currentState.cursorPosition = position;
    this.currentState.selectedDataPoint = dataPoint;

    this.subscribers.forEach((subscriber, chartId) => {
      if (chartId !== sourceChartId && subscriber.active && subscriber.onCursorMove) {
        try {
          subscriber.onCursorMove(position, dataPoint);
        } catch (error) {
          console.error(`Cursor sync error for ${chartId}:`, error);
        }
      }
    });
  }

  /**
   * Broadcast pan event to all subscribed charts
   * @param {string} sourceChartId - Chart that initiated the pan
   * @param {Object} panData - Pan offset data
   */
  broadcastPan(sourceChartId, panData) {
    this.currentState.xRange = panData.xRange;
    this.currentState.yRange = panData.yRange;

    this.subscribers.forEach((subscriber, chartId) => {
      if (chartId !== sourceChartId && subscriber.active && subscriber.onPan) {
        try {
          subscriber.onPan(panData);
        } catch (error) {
          console.error(`Pan sync error for ${chartId}:`, error);
        }
      }
    });
  }

  /**
   * Broadcast reset event to all subscribed charts
   * @param {string} sourceChartId - Chart that initiated the reset
   */
  broadcastReset(sourceChartId = null) {
    this.currentState = {
      xRange: null,
      yRange: null,
      cursorPosition: null,
      selectedDataPoint: null,
      zoomLevel: 1
    };

    this.subscribers.forEach((subscriber, chartId) => {
      if (chartId !== sourceChartId && subscriber.active && subscriber.onReset) {
        try {
          subscriber.onReset();
        } catch (error) {
          console.error(`Reset sync error for ${chartId}:`, error);
        }
      }
    });
  }

  /**
   * Broadcast data point selection
   * @param {string} sourceChartId - Chart that initiated the selection
   * @param {Object} dataPoint - Selected data point
   */
  broadcastSelection(sourceChartId, dataPoint) {
    this.currentState.selectedDataPoint = dataPoint;

    this.subscribers.forEach((subscriber, chartId) => {
      if (chartId !== sourceChartId && subscriber.active && subscriber.onSelection) {
        try {
          subscriber.onSelection(dataPoint);
        } catch (error) {
          console.error(`Selection sync error for ${chartId}:`, error);
        }
      }
    });
  }

  /**
   * Get current synchronization state
   * @returns {Object} Current state
   */
  getCurrentState() {
    return { ...this.currentState };
  }

  /**
   * Enable/disable a specific chart's synchronization
   * @param {string} chartId - Chart identifier
   * @param {boolean} active - Whether the chart should receive sync events
   */
  setChartActive(chartId, active) {
    const subscriber = this.subscribers.get(chartId);
    if (subscriber) {
      subscriber.active = active;
    }
  }

  /**
   * Get list of active charts
   * @returns {Array} Array of active chart IDs
   */
  getActiveCharts() {
    return Array.from(this.subscribers.entries())
      .filter(([_, subscriber]) => subscriber.active)
      .map(([chartId, _]) => chartId);
  }

  /**
   * Debounced cursor broadcast to prevent excessive updates
   * @param {string} sourceChartId - Source chart ID
   * @param {number} position - Cursor position
   * @param {Object} dataPoint - Data point information
   */
  debouncedCursorBroadcast = this.debounce((sourceChartId, position, dataPoint) => {
    this.broadcastCursor(sourceChartId, position, dataPoint);
  }, 16); // ~60fps

  /**
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Create singleton instance
const chartSyncService = new ChartSyncService();

export default chartSyncService;