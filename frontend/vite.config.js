import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh for better development experience
      fastRefresh: true,
      // Optimize React development
      jsxImportSource: undefined,
      jsxRuntime: 'automatic'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Build optimizations
  build: {
    // Target modern browsers for better performance
    target: 'es2015',
    
    // Source map configuration
    sourcemap: false, // Disable in production for better performance
    
    // Compression and optimization
    minify: 'esbuild',
    cssMinify: true,
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Rollup options for advanced optimization
    rollupOptions: {
      output: {
        // Separate chunks for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-slot'],
          
          // Feature-based chunks
          'charts': ['./src/components/charts'],
          'dashboard': ['./src/components/Dashboard.jsx', './src/pages/Dashboard.jsx'],
          'upload': ['./src/pages/Upload.jsx'],
          'analysis': ['./src/pages/Analysis.jsx'],
          
          // UI components chunk
          'ui-components': [
            './src/components/ui/button.jsx',
            './src/components/ui/card.jsx',
            './src/components/ui/input.jsx',
            './src/components/ui/dialog.jsx'
          ]
        },
        
        // Asset naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId && facadeModuleId.includes('node_modules')) {
            return 'vendor/[name]-[hash].js'
          }
          return 'chunks/[name]-[hash].js'
        },
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      
      // External dependencies (if needed)
      external: [],
      
      // Input optimization
      treeshake: {
        moduleSideEffects: false
      }
    }
  },
  
  // Development server optimizations
  server: {
    // Enable CORS for development
    cors: true,
    
    // Hot module replacement
    hmr: {
      overlay: true
    },
    
    // Development server performance
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  
  // Optimization configuration
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server startup
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot'
    ],
    
    // Exclude specific dependencies from pre-bundling if needed
    exclude: []
  },
  
  // CSS configuration
  css: {
    // CSS modules configuration
    modules: {
      localsConvention: 'camelCaseOnly'
    },
    
    // PostCSS configuration
    postcss: {
      // Can add autoprefixer, cssnano, etc. here if needed
    },
    
    // Development source maps for CSS
    devSourcemap: true
  },
  
  // Preview server configuration (for production preview)
  preview: {
    port: 5000,
    strictPort: true,
    cors: true
  },
  
  // Environment variables
  define: {
    // Define global constants
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  
  // Public directory
  publicDir: 'public',
  
  // Base URL for assets
  base: './',
  
  // ESBuild configuration for faster builds
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    
    // Target modern JS features
    target: 'es2020',
    
    // JSX configuration
    jsx: 'automatic'
  }
})
