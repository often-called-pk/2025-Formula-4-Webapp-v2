import React, { useState } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCcw, Settings, Eye, EyeOff } from 'lucide-react';

const ChartControls = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExport,
  onToggleFeature,
  features = {},
  exportFormats = ['PNG', 'SVG', 'CSV'],
  disabled = false,
  className = ''
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFeatureMenu, setShowFeatureMenu] = useState(false);

  const handleExport = (format) => {
    if (onExport) {
      onExport(format.toLowerCase());
    }
    setShowExportMenu(false);
  };

  const handleFeatureToggle = (feature) => {
    if (onToggleFeature) {
      onToggleFeature(feature);
    }
  };

  return (
    <div className={`chart-controls flex items-center gap-2 ${className}`}>
      {/* Zoom Controls */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={onZoomIn}
          disabled={disabled}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        
        <button
          onClick={onZoomOut}
          disabled={disabled}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        
        <button
          onClick={onResetZoom}
          disabled={disabled}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Feature Toggle Controls */}
      {Object.keys(features).length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowFeatureMenu(!showFeatureMenu)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Toggle Features"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Features</span>
          </button>

          {showFeatureMenu && (
            <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-48">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Chart Features
                </div>
                {Object.entries(features).map(([key, feature]) => (
                  <button
                    key={key}
                    onClick={() => handleFeatureToggle(key)}
                    className="w-full flex items-center justify-between px-2 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <span>{feature.label}</span>
                    {feature.enabled ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Controls */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export Chart"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">Export</span>
        </button>

        {showExportMenu && (
          <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Export Format
              </div>
              {exportFormats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {format} {format === 'PNG' ? '(Image)' : format === 'SVG' ? '(Vector)' : '(Data)'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showExportMenu || showFeatureMenu) && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => {
            setShowExportMenu(false);
            setShowFeatureMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default ChartControls;