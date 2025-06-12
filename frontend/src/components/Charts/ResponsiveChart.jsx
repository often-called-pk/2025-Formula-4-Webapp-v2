import React, { useState, useEffect, useRef } from 'react';
import { useChart } from './ChartContext';
import ChartControls from './ChartControls';
import ExportModal from './ExportModal';
import { useChartExport } from '../../hooks/useChartExport';

const ResponsiveChart = ({
  children,
  title,
  subtitle,
  showControls = true,
  showExport = true,
  showHeader = true,
  features = {},
  onFeatureToggle,
  exportData,
  className = '',
  ...props
}) => {
  const { theme, colors } = useChart();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  const {
    isExporting,
    exportError,
    exportChart,
    clearError
  } = useChartExport(chartRef);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Container size tracking
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Chart control handlers
  const handleZoomIn = () => {
    if (chartRef.current && chartRef.current.elm) {
      // Trigger Plotly zoom in
      const plotlyDiv = chartRef.current.elm;
      if (plotlyDiv.layout) {
        const currentXRange = plotlyDiv.layout.xaxis.range;
        const currentYRange = plotlyDiv.layout.yaxis.range;
        
        if (currentXRange && currentYRange) {
          const xCenter = (currentXRange[0] + currentXRange[1]) / 2;
          const yCenter = (currentYRange[0] + currentYRange[1]) / 2;
          const xZoom = (currentXRange[1] - currentXRange[0]) * 0.7;
          const yZoom = (currentYRange[1] - currentYRange[0]) * 0.7;
          
          window.Plotly?.relayout(plotlyDiv, {
            'xaxis.range': [xCenter - xZoom/2, xCenter + xZoom/2],
            'yaxis.range': [yCenter - yZoom/2, yCenter + yZoom/2]
          });
        }
      }
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current && chartRef.current.elm) {
      const plotlyDiv = chartRef.current.elm;
      if (plotlyDiv.layout) {
        const currentXRange = plotlyDiv.layout.xaxis.range;
        const currentYRange = plotlyDiv.layout.yaxis.range;
        
        if (currentXRange && currentYRange) {
          const xCenter = (currentXRange[0] + currentXRange[1]) / 2;
          const yCenter = (currentYRange[0] + currentYRange[1]) / 2;
          const xZoom = (currentXRange[1] - currentXRange[0]) * 1.4;
          const yZoom = (currentYRange[1] - currentYRange[0]) * 1.4;
          
          window.Plotly?.relayout(plotlyDiv, {
            'xaxis.range': [xCenter - xZoom/2, xCenter + xZoom/2],
            'yaxis.range': [yCenter - yZoom/2, yCenter + yZoom/2]
          });
        }
      }
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current && chartRef.current.elm) {
      window.Plotly?.relayout(chartRef.current.elm, {
        'xaxis.autorange': true,
        'yaxis.autorange': true
      });
    }
  };

  const handleExportRequest = (format) => {
    setIsExportModalOpen(true);
  };

  const handleExport = async (format, options) => {
    try {
      await exportChart(format, exportData, options);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Responsive class names
  const containerClasses = [
    'racing-chart-container',
    'w-full',
    isMobile ? 'mobile' : 'desktop',
    theme === 'dark' ? 'dark' : 'light',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
      data-theme={theme}
      {...props}
    >
      {/* Header */}
      {showHeader && (title || subtitle) && (
        <div className="racing-chart-header">
          {title && <h3>{title}</h3>}
          {subtitle && <div className="subtitle">{subtitle}</div>}
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
          {/* Feature toggles (left side) */}
          {Object.keys(features).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(features).map(([key, feature]) => (
                <button
                  key={key}
                  onClick={() => onFeatureToggle?.(key)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    feature.enabled
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {feature.label}
                </button>
              ))}
            </div>
          )}

          {/* Chart controls (right side) */}
          <ChartControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onExport={showExport ? handleExportRequest : undefined}
            features={features}
            onToggleFeature={onFeatureToggle}
            disabled={isExporting}
            className={isMobile ? 'w-full justify-center' : ''}
          />
        </div>
      )}

      {/* Chart Content */}
      <div className="relative">
        {React.cloneElement(children, {
          ref: chartRef,
          responsive: true,
          style: {
            width: '100%',
            height: isMobile ? '300px' : '500px',
            ...children.props.style
          }
        })}

        {/* Overlay for mobile touch improvements */}
        {isMobile && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Touch-friendly zoom indicators */}
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Pinch to zoom
            </div>
          </div>
        )}
      </div>

      {/* Racing-themed performance metrics (if container is large enough) */}
      {!isMobile && containerSize.width > 800 && (
        <div className="racing-metrics-grid p-4">
          <div className="racing-metric-card">
            <div className="racing-metric-label">Resolution</div>
            <div className="racing-metric-value">
              {containerSize.width}×{containerSize.height}
              <span className="racing-metric-unit">px</span>
            </div>
          </div>
          
          <div className="racing-metric-card">
            <div className="racing-metric-label">Theme</div>
            <div className="racing-metric-value">
              {theme.charAt(0).toUpperCase() + theme.slice(1)}
              <span className="racing-metric-unit">mode</span>
            </div>
          </div>
          
          <div className="racing-metric-card">
            <div className="racing-metric-label">Device</div>
            <div className="racing-metric-value">
              {isMobile ? 'Mobile' : 'Desktop'}
              <span className="racing-metric-unit">view</span>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => {
            setIsExportModalOpen(false);
            clearError();
          }}
          onExport={handleExport}
          title={`Export ${title || 'Chart'}`}
          isExporting={isExporting}
          exportError={exportError}
        />
      )}
    </div>
  );
};

export default ResponsiveChart;