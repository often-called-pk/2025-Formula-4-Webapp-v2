import React, { createContext, useContext, useState } from 'react';

// Chart context for managing global chart settings and themes
const ChartContext = createContext();

export const useChart = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a ChartProvider');
  }
  return context;
};

export const ChartProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');
  const [defaultConfig, setDefaultConfig] = useState({
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: 'telemetry_chart',
      height: 800,
      width: 1200,
      scale: 2
    }
  });

  // Racing-themed color palettes
  const colorPalettes = {
    dark: {
      background: '#1a1a1a',
      paper: '#2d2d2d',
      primary: '#dc2626', // Racing red
      secondary: '#f59e0b', // Amber
      accent: '#3b82f6', // Blue
      text: '#ffffff',
      textSecondary: '#a1a1aa',
      grid: '#404040',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      driver1: '#dc2626', // Racing red
      driver2: '#3b82f6', // Blue
      driver3: '#10b981', // Green
      driver4: '#f59e0b', // Amber
    },
    light: {
      background: '#ffffff',
      paper: '#f8fafc',
      primary: '#dc2626', // Racing red
      secondary: '#f59e0b', // Amber
      accent: '#3b82f6', // Blue
      text: '#1f2937',
      textSecondary: '#6b7280',
      grid: '#e5e7eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      driver1: '#dc2626', // Racing red
      driver2: '#1e40af', // Darker blue for light mode
      driver3: '#059669', // Darker green for light mode
      driver4: '#d97706', // Darker amber for light mode
    }
  };

  // Get current color palette
  const colors = colorPalettes[theme];

  // Base layout configuration for racing charts
  const getBaseLayout = (title, customLayout = {}) => ({
    title: {
      text: title,
      font: {
        family: 'Inter, system-ui, sans-serif',
        size: 18,
        color: colors.text,
        weight: 600
      },
      x: 0.02,
      xanchor: 'left'
    },
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: colors.text
    },
    plot_bgcolor: colors.background,
    paper_bgcolor: colors.paper,
    margin: { l: 60, r: 60, t: 60, b: 60 },
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0,
      y: -0.1,
      bgcolor: 'rgba(0,0,0,0)',
      bordercolor: 'rgba(0,0,0,0)',
      font: {
        color: colors.text,
        size: 12
      }
    },
    xaxis: {
      gridcolor: colors.grid,
      linecolor: colors.grid,
      tickcolor: colors.grid,
      tickfont: { color: colors.text, size: 12 },
      titlefont: { color: colors.text, size: 14 }
    },
    yaxis: {
      gridcolor: colors.grid,
      linecolor: colors.grid,
      tickcolor: colors.grid,
      tickfont: { color: colors.text, size: 12 },
      titlefont: { color: colors.text, size: 14 }
    },
    ...customLayout
  });

  // Standard racing data series styling
  const getDriverLineStyle = (driverIndex = 0, customStyle = {}) => {
    const driverColors = [colors.driver1, colors.driver2, colors.driver3, colors.driver4];
    const baseStyle = {
      line: {
        width: 3,
        color: driverColors[driverIndex % driverColors.length],
        smoothing: 1.3
      },
      mode: 'lines',
      hovertemplate: '%{y:.1f}<extra></extra>',
      ...customStyle
    };
    return baseStyle;
  };

  // Chart utilities
  const chartUtils = {
    formatSpeed: (speed) => `${speed?.toFixed(1) || 0} km/h`,
    formatDistance: (distance) => `${(distance / 1000)?.toFixed(2) || 0} km`,
    formatTime: (time) => `${time?.toFixed(3) || 0}s`,
    formatRPM: (rpm) => `${rpm?.toFixed(0) || 0} RPM`,
    formatTemperature: (temp) => `${temp?.toFixed(1) || 0}°C`,
    formatThrottle: (throttle) => `${throttle?.toFixed(1) || 0}%`,
    formatBrake: (brake) => `${brake?.toFixed(1) || 0}%`,
    
    // Generate responsive height based on container width
    getResponsiveHeight: (width) => {
      if (width < 640) return 300; // Mobile
      if (width < 1024) return 400; // Tablet
      return 500; // Desktop
    },

    // Sample large datasets for performance
    sampleData: (data, maxPoints = 1000) => {
      if (!data || data.length <= maxPoints) return data;
      const step = Math.ceil(data.length / maxPoints);
      return data.filter((_, index) => index % step === 0);
    }
  };

  const value = {
    theme,
    setTheme,
    colors,
    defaultConfig,
    setDefaultConfig,
    getBaseLayout,
    getDriverLineStyle,
    chartUtils,
    colorPalettes
  };

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  );
};