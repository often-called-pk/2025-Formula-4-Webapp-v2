import React, { useState } from 'react';
import { X, Download, AlertCircle, CheckCircle } from 'lucide-react';

const ExportModal = ({
  isOpen,
  onClose,
  onExport,
  title = 'Export Chart',
  isExporting = false,
  exportError = null,
  availableFormats = ['PNG', 'SVG', 'CSV']
}) => {
  const [selectedFormat, setSelectedFormat] = useState('PNG');
  const [exportOptions, setExportOptions] = useState({
    width: 1200,
    height: 800,
    scale: 2,
    filename: ''
  });
  const [exportSuccess, setExportSuccess] = useState(false);

  const formatConfig = {
    PNG: {
      name: 'PNG Image',
      description: 'High-quality raster image, perfect for presentations and documents',
      extension: '.png',
      options: ['width', 'height', 'scale', 'filename']
    },
    SVG: {
      name: 'SVG Vector',
      description: 'Scalable vector graphics, ideal for publications and print',
      extension: '.svg',
      options: ['width', 'height', 'filename']
    },
    CSV: {
      name: 'CSV Data',
      description: 'Raw telemetry data in spreadsheet format for further analysis',
      extension: '.csv',
      options: ['filename']
    }
  };

  const handleExport = async () => {
    try {
      setExportSuccess(false);
      const filename = exportOptions.filename || `telemetry_${selectedFormat.toLowerCase()}_${Date.now()}`;
      
      await onExport(selectedFormat.toLowerCase(), {
        ...exportOptions,
        filename
      });
      
      setExportSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        setExportSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleOptionChange = (option, value) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  if (!isOpen) return null;

  const config = formatConfig[selectedFormat];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-1 gap-2">
                {availableFormats.map((format) => {
                  const formatInfo = formatConfig[format];
                  return (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedFormat === format
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {formatInfo.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatInfo.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export Options */}
            {config && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Export Options
                </label>
                <div className="space-y-4">
                  {config.options.includes('filename') && (
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Filename (optional)
                      </label>
                      <input
                        type="text"
                        value={exportOptions.filename}
                        onChange={(e) => handleOptionChange('filename', e.target.value)}
                        placeholder={`telemetry_${selectedFormat.toLowerCase()}_${Date.now()}`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  )}

                  {config.options.includes('width') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Width (px)
                        </label>
                        <input
                          type="number"
                          value={exportOptions.width}
                          onChange={(e) => handleOptionChange('width', parseInt(e.target.value))}
                          min="400"
                          max="4000"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Height (px)
                        </label>
                        <input
                          type="number"
                          value={exportOptions.height}
                          onChange={(e) => handleOptionChange('height', parseInt(e.target.value))}
                          min="300"
                          max="3000"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                  )}

                  {config.options.includes('scale') && (
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Scale Factor
                      </label>
                      <select
                        value={exportOptions.scale}
                        onChange={(e) => handleOptionChange('scale', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value={1}>1x (Standard)</option>
                        <option value={2}>2x (High Quality)</option>
                        <option value={3}>3x (Ultra High Quality)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Messages */}
            {exportError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div className="text-sm text-red-700 dark:text-red-400">
                  Export failed: {exportError}
                </div>
              </div>
            )}

            {exportSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="text-sm text-green-700 dark:text-green-400">
                  Export completed successfully!
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || exportSuccess}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {selectedFormat}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;