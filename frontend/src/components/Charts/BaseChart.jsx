import React, { useState, useEffect, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { useChart } from './ChartContext';

// Error boundary for chart components
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">⚠️ Chart Error</div>
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              Failed to render chart: {this.state.error?.message}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const ChartLoading = ({ height = 400 }) => (
  <div 
    className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse"
    style={{ height }}
  >
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-500 border-r-transparent"></div>
      <div className="mt-2 text-gray-600 dark:text-gray-400">Loading chart...</div>
    </div>
  </div>
);

// Main BaseChart component
const BaseChart = ({
  data = [],
  layout = {},
  config = {},
  title = '',
  loading = false,
  error = null,
  className = '',
  onInitialized = null,
  onUpdate = null,
  onRelayout = null,
  onSelected = null,
  onError = null,
  responsive = true,
  style = {},
  ...props
}) => {
  const { 
    defaultConfig, 
    getBaseLayout, 
    colors, 
    chartUtils 
  } = useChart();

  const [plotData, setPlotData] = useState(data);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const containerRef = useRef(null);
  const plotRef = useRef(null);

  // Handle responsive resizing
  useEffect(() => {
    if (!responsive || !containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const height = chartUtils.getResponsiveHeight(width);
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [responsive, chartUtils]);

  // Process and sample data for performance
  useEffect(() => {
    if (!data || !Array.isArray(data)) {
      setPlotData([]);
      return;
    }

    // Sample large datasets for performance
    const processedData = data.map(series => {
      if (series.x && series.x.length > 1000) {
        const sampledIndices = chartUtils.sampleData(
          Array.from({ length: series.x.length }, (_, i) => i), 
          1000
        );
        
        return {
          ...series,
          x: sampledIndices.map(i => series.x[i]),
          y: sampledIndices.map(i => series.y[i]),
          text: series.text ? sampledIndices.map(i => series.text[i]) : undefined,
          customdata: series.customdata ? sampledIndices.map(i => series.customdata[i]) : undefined
        };
      }
      return series;
    });

    setPlotData(processedData);
  }, [data, chartUtils]);

  // Error handler
  const handleError = useCallback((error) => {
    console.error('Chart rendering error:', error);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // Event handlers
  const handleInitialized = useCallback((figure, graphDiv) => {
    if (onInitialized) {
      onInitialized(figure, graphDiv);
    }
  }, [onInitialized]);

  const handleUpdate = useCallback((figure, graphDiv) => {
    if (onUpdate) {
      onUpdate(figure, graphDiv);
    }
  }, [onUpdate]);

  const handleRelayout = useCallback((eventData) => {
    if (onRelayout) {
      onRelayout(eventData);
    }
  }, [onRelayout]);

  const handleSelected = useCallback((eventData) => {
    if (onSelected) {
      onSelected(eventData);
    }
  }, [onSelected]);

  // Merge configurations
  const finalLayout = {
    ...getBaseLayout(title),
    ...layout,
    ...(responsive && {
      width: dimensions.width || undefined,
      height: dimensions.height,
      autosize: true
    })
  };

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  // Handle error state
  if (error) {
    return (
      <div className={`${className}`} style={style}>
        <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">⚠️ Chart Error</div>
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error.message || 'An error occurred while rendering the chart'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className={`${className}`} style={style}>
        <ChartLoading height={dimensions.height} />
      </div>
    );
  }

  // Handle empty data
  if (!plotData || plotData.length === 0) {
    return (
      <div className={`${className}`} style={style}>
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">📊</div>
            <div className="text-gray-600 dark:text-gray-400">
              No data available for chart
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChartErrorBoundary>
      <div 
        ref={containerRef} 
        className={`chart-container ${className}`}
        style={style}
      >
        <Plot
          ref={plotRef}
          data={plotData}
          layout={finalLayout}
          config={finalConfig}
          onInitialized={handleInitialized}
          onUpdate={handleUpdate}
          onRelayout={handleRelayout}
          onSelected={handleSelected}
          onError={handleError}
          useResizeHandler={responsive}
          style={{ width: '100%', height: '100%' }}
          {...props}
        />
      </div>
    </ChartErrorBoundary>
  );
};

export default BaseChart;